<?php
if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('savol_financing_activate')) :

define('SAVOL_FINANCING_LEAD_POST_TYPE', 'savol_finance_lead');
define('SAVOL_FINANCING_LEADS_TOKEN_OPTION', 'savol_financing_leads_token');
define('SAVOL_FINANCING_PUBLIC_SITE_URL', 'https://savolseminovos.com.br');
define('SAVOL_FINANCING_MANAGER_ROLE', 'gestor_savol');
define('SAVOL_FINANCING_CAPS', [
    'edit_post' => 'edit_savol_finance_lead',
    'read_post' => 'read_savol_finance_lead',
    'delete_post' => 'delete_savol_finance_lead',
    'edit_posts' => 'edit_savol_finance_leads',
    'edit_others_posts' => 'edit_others_savol_finance_leads',
    'publish_posts' => 'publish_savol_finance_leads',
    'read_private_posts' => 'read_private_savol_finance_leads',
    'delete_posts' => 'delete_savol_finance_leads',
    'delete_private_posts' => 'delete_private_savol_finance_leads',
    'delete_published_posts' => 'delete_published_savol_finance_leads',
    'delete_others_posts' => 'delete_others_savol_finance_leads',
    'edit_private_posts' => 'edit_private_savol_finance_leads',
    'edit_published_posts' => 'edit_published_savol_finance_leads',
    'create_posts' => 'do_not_allow',
]);


add_action('init', 'savol_financing_register_post_type');
add_action('init', 'savol_financing_sync_roles', 30);
add_action('rest_api_init', 'savol_financing_register_rest_routes');
add_action('admin_menu', 'savol_financing_register_settings_page');
add_action('admin_init', 'savol_financing_register_settings');
add_action('add_meta_boxes', 'savol_financing_register_meta_boxes');
add_action('admin_post_savol_financing_export_pdf', 'savol_financing_export_pdf');
add_filter('manage_savol_finance_lead_posts_columns', 'savol_financing_admin_columns');
add_action('manage_savol_finance_lead_posts_custom_column', 'savol_financing_admin_column_content', 10, 2);

function savol_financing_activate(): void
{
    if (!get_option(SAVOL_FINANCING_LEADS_TOKEN_OPTION)) {
        update_option(SAVOL_FINANCING_LEADS_TOKEN_OPTION, wp_generate_password(48, false, false), false);
    }

    savol_financing_register_post_type();
    savol_financing_sync_roles();
    flush_rewrite_rules();
}

function savol_financing_register_post_type(): void
{
    register_post_type(SAVOL_FINANCING_LEAD_POST_TYPE, [
        'labels' => [
            'name' => 'Leads Financiamento',
            'singular_name' => 'Lead Financiamento',
            'menu_name' => 'Leads Financiamento',
            'add_new_item' => 'Adicionar lead',
            'edit_item' => 'Ver lead',
            'search_items' => 'Buscar leads',
            'not_found' => 'Nenhum lead encontrado',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-money-alt',
        'capability_type' => ['savol_finance_lead', 'savol_finance_leads'],
        'capabilities' => SAVOL_FINANCING_CAPS,
        'map_meta_cap' => true,
        'supports' => ['title', 'editor'],
    ]);
}

function savol_financing_sync_roles(): void
{
    $caps = array_values(array_unique(array_filter(SAVOL_FINANCING_CAPS, static function ($cap): bool {
        return is_string($cap) && $cap !== 'do_not_allow';
    })));

    foreach (['administrator', SAVOL_FINANCING_MANAGER_ROLE] as $role_name) {
        $role = get_role($role_name);
        if (!$role) {
            continue;
        }

        foreach ($caps as $cap) {
            $role->add_cap($cap);
        }
    }
}

function savol_financing_register_rest_routes(): void
{
    register_rest_route('savol/v1', '/financiamento-leads', [
        'methods' => 'POST',
        'callback' => 'savol_financing_receive_lead',
        'permission_callback' => 'savol_financing_can_receive_lead',
    ]);
}

function savol_financing_register_settings_page(): void
{
    add_options_page(
        'SAVOL Financiamento',
        'SAVOL Financiamento',
        'manage_options',
        'savol-financiamento',
        'savol_financing_render_settings_page'
    );
}

function savol_financing_register_settings(): void
{
    register_setting('savol_financing_leads_settings', SAVOL_FINANCING_LEADS_TOKEN_OPTION, [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => '',
    ]);
}

function savol_financing_get_expected_token(): string
{
    if (defined('SAVOL_FINANCING_LEADS_TOKEN')) {
        return trim((string) constant('SAVOL_FINANCING_LEADS_TOKEN'));
    }

    return trim((string) get_option(SAVOL_FINANCING_LEADS_TOKEN_OPTION, ''));
}

function savol_financing_get_bearer_token(WP_REST_Request $request): string
{
    $header = $request->get_header('authorization');
    if (!$header || stripos($header, 'Bearer ') !== 0) {
        return '';
    }

    return trim(substr($header, 7));
}

function savol_financing_can_receive_lead(WP_REST_Request $request)
{
    $expected_token = savol_financing_get_expected_token();
    if (!$expected_token) {
        return new WP_Error('savol_financing_token_missing', 'Token do receptor nao configurado.', ['status' => 500]);
    }

    $provided_token = savol_financing_get_bearer_token($request);
    if (!$provided_token || !hash_equals($expected_token, $provided_token)) {
        return new WP_Error('savol_financing_unauthorized', 'Token invalido.', ['status' => 401]);
    }

    return true;
}

function savol_financing_json_error(string $message, int $status = 400): WP_Error
{
    return new WP_Error('savol_financing_error', $message, ['status' => $status]);
}

function savol_financing_clean_digits($value, int $limit = 20): string
{
    return substr(preg_replace('/\D+/', '', (string) $value), 0, $limit);
}

function savol_financing_clean_array($value)
{
    if (is_array($value)) {
        $clean = [];
        foreach ($value as $key => $item) {
            $safe_key = is_string($key) ? preg_replace('/[^A-Za-z0-9_\-]/', '', $key) : $key;
            $clean[$safe_key] = savol_financing_clean_array($item);
        }

        return $clean;
    }

    if (is_bool($value) || is_numeric($value) || $value === null) {
        return $value;
    }

    return sanitize_textarea_field((string) $value);
}

function savol_financing_meta_json($value): string
{
    return wp_json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function savol_financing_create_protocol(): string
{
    return 'SAVOL-FIN-' . gmdate('Ymd') . '-' . wp_rand(100000, 999999);
}

function savol_financing_is_technical_unit_id($value): bool
{
    return preg_match('/^\d{4,}$/', trim((string) $value)) === 1;
}

function savol_financing_clean_unit_name($value): string
{
    return trim(preg_replace('/^loja:\s*/i', '', sanitize_text_field((string) $value)));
}

function savol_financing_resolve_unit_name($unit_name, array $vehicle = [], array $meta = [], array $leadmob_preview = []): string
{
    $candidates = [
        $vehicle['store'] ?? '',
        $vehicle['unitName'] ?? '',
        $vehicle['unit'] ?? '',
        $meta['unit_name'] ?? '',
        $meta['unitName'] ?? '',
        $meta['unidade'] ?? '',
        $meta['store'] ?? '',
        $meta['store_name'] ?? '',
        $leadmob_preview['unidade'] ?? '',
        $unit_name,
    ];

    foreach ($candidates as $candidate) {
        $clean = savol_financing_clean_unit_name($candidate);
        if ($clean !== '' && !savol_financing_is_technical_unit_id($clean)) {
            return $clean;
        }
    }

    foreach ($candidates as $candidate) {
        if (savol_financing_is_technical_unit_id($candidate)) {
            return 'SAVOL Seminovos - Simulador Banco Volkswagen';
        }
    }

    return '';
}

function savol_financing_receive_lead(WP_REST_Request $request)
{
    $params = $request->get_json_params();
    if (!is_array($params)) {
        return savol_financing_json_error('Payload JSON invalido.');
    }

    $payload = savol_financing_clean_array($params);
    $lead = isset($payload['lead']) && is_array($payload['lead']) ? $payload['lead'] : [];
    $vehicle = isset($payload['vehicle']) && is_array($payload['vehicle']) ? $payload['vehicle'] : [];
    $source = isset($payload['source']) && is_array($payload['source']) ? $payload['source'] : [];
    $utm = isset($payload['utm']) && is_array($payload['utm']) ? $payload['utm'] : [];
    $meta = isset($payload['meta']) && is_array($payload['meta']) ? $payload['meta'] : [];
    $leadmob_preview = isset($payload['leadmobPreview']) && is_array($payload['leadmobPreview']) ? $payload['leadmobPreview'] : [];

    $protocol = sanitize_text_field($payload['protocol'] ?? savol_financing_create_protocol());
    $name = sanitize_text_field($lead['name'] ?? '');
    $phone = savol_financing_clean_digits($lead['phone'] ?? '', 13);
    $email = sanitize_email($lead['email'] ?? '');
    $cpf = savol_financing_clean_digits($lead['cpf'] ?? '', 11);
    $raw_unit_name = sanitize_text_field($lead['unitName'] ?? '');
    $unit_name = savol_financing_resolve_unit_name($raw_unit_name, $vehicle, $meta, $leadmob_preview);
    $message = sanitize_textarea_field($lead['message'] ?? '');

    if (!$name) {
        return savol_financing_json_error('Informe o nome.');
    }

    if (strlen($phone) < 10) {
        return savol_financing_json_error('Informe um telefone valido.');
    }

    if (!$email || !is_email($email)) {
        return savol_financing_json_error('Informe um e-mail valido.');
    }

    $vehicle_name = trim(implode(' ', array_filter([
        sanitize_text_field($vehicle['brand'] ?? ''),
        sanitize_text_field($vehicle['model'] ?? ''),
        sanitize_text_field($vehicle['version'] ?? ''),
    ])));

    $post_id = wp_insert_post([
        'post_type' => SAVOL_FINANCING_LEAD_POST_TYPE,
        'post_status' => 'private',
        'post_title' => trim(implode(' - ', array_filter([$protocol, $name, $vehicle_name]))),
        'post_content' => $message,
    ], true);

    if (is_wp_error($post_id)) {
        return savol_financing_json_error('Nao foi possivel salvar o lead.', 500);
    }

    update_post_meta($post_id, '_savol_finance_protocol', $protocol);
    update_post_meta($post_id, '_savol_finance_name', $name);
    update_post_meta($post_id, '_savol_finance_phone', $phone);
    update_post_meta($post_id, '_savol_finance_email', $email);
    update_post_meta($post_id, '_savol_finance_cpf', $cpf);
    update_post_meta($post_id, '_savol_finance_unit', $unit_name);
    update_post_meta($post_id, '_savol_finance_unit_raw', $raw_unit_name);
    update_post_meta($post_id, '_savol_finance_form', sanitize_text_field($source['form'] ?? ''));
    update_post_meta($post_id, '_savol_finance_subject', sanitize_text_field($source['subject'] ?? ''));
    update_post_meta($post_id, '_savol_finance_vehicle_name', $vehicle_name);
    update_post_meta($post_id, '_savol_finance_vehicle', savol_financing_meta_json($vehicle));
    update_post_meta($post_id, '_savol_finance_utm', savol_financing_meta_json($utm));
    update_post_meta($post_id, '_savol_finance_meta', savol_financing_meta_json($meta));
    update_post_meta($post_id, '_savol_finance_leadmob_preview', savol_financing_meta_json($leadmob_preview));
    update_post_meta($post_id, '_savol_finance_payload', savol_financing_meta_json($payload));
    update_post_meta($post_id, '_savol_finance_received_at', current_time('mysql'));

    return [
        'ok' => true,
        'id' => (int) $post_id,
        'protocol' => $protocol,
    ];
}

function savol_financing_admin_columns(array $columns): array
{
    return [
        'cb' => $columns['cb'],
        'title' => 'Lead',
        'protocol' => 'Protocolo',
        'phone' => 'Telefone',
        'unit' => 'Unidade',
        'vehicle' => 'Veiculo',
        'date' => $columns['date'],
    ];
}

function savol_financing_admin_column_content(string $column, int $post_id): void
{
    $meta_key = [
        'protocol' => '_savol_finance_protocol',
        'phone' => '_savol_finance_phone',
        'unit' => '_savol_finance_unit',
        'vehicle' => '_savol_finance_vehicle_name',
    ][$column] ?? '';

    if ($meta_key) {
        echo esc_html((string) get_post_meta($post_id, $meta_key, true));
    }
}

function savol_financing_register_meta_boxes(): void
{
    add_meta_box(
        'savol_financing_lead_details',
        'Dados do lead',
        'savol_financing_render_lead_meta_box',
        SAVOL_FINANCING_LEAD_POST_TYPE,
        'normal',
        'high'
    );

    add_meta_box(
        'savol_financing_lead_actions',
        'Relatorio',
        'savol_financing_render_actions_meta_box',
        SAVOL_FINANCING_LEAD_POST_TYPE,
        'side',
        'high'
    );
}

function savol_financing_render_actions_meta_box(WP_Post $post): void
{
    $url = wp_nonce_url(
        admin_url('admin-post.php?action=savol_financing_export_pdf&lead_id=' . (int) $post->ID),
        'savol_financing_export_pdf_' . (int) $post->ID
    );

    echo '<p><a class="button button-primary" style="width:100%;text-align:center;" target="_blank" href="' . esc_url($url) . '">Exportar PDF</a></p>';
    echo '<p class="description">Abre um relatorio pronto para imprimir ou salvar em PDF, com fotos quando o lead possui imagens do veiculo.</p>';
}

function savol_financing_render_lead_meta_box(WP_Post $post): void
{
    $fields = [
        'Protocolo' => '_savol_finance_protocol',
        'Nome' => '_savol_finance_name',
        'Telefone' => '_savol_finance_phone',
        'E-mail' => '_savol_finance_email',
        'CPF' => '_savol_finance_cpf',
        'Unidade' => '_savol_finance_unit',
        'Formulario' => '_savol_finance_form',
        'Assunto' => '_savol_finance_subject',
        'Veiculo' => '_savol_finance_vehicle_name',
        'Recebido em' => '_savol_finance_received_at',
    ];

    echo '<table class="widefat striped"><tbody>';
    foreach ($fields as $label => $meta_key) {
        echo '<tr><th style="width:180px;">' . esc_html($label) . '</th><td>' . esc_html((string) get_post_meta($post->ID, $meta_key, true)) . '</td></tr>';
    }
    echo '</tbody></table>';

    $photos = savol_financing_get_vehicle_photo_urls($post->ID);
    if (!empty($photos)) {
        echo '<p><strong>Fotos do veiculo</strong></p>';
        echo '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin:10px 0 18px;">';
        foreach ($photos as $photo_url) {
            echo '<a href="' . esc_url($photo_url) . '" target="_blank" style="display:block;border:1px solid #dcdcde;border-radius:8px;overflow:hidden;background:#f6f7f7;">';
            echo '<img src="' . esc_url($photo_url) . '" alt="" style="display:block;width:100%;height:118px;object-fit:cover;">';
            echo '</a>';
        }
        echo '</div>';
    }

    $json_blocks = [
        'Veiculo JSON' => '_savol_finance_vehicle',
        'UTM JSON' => '_savol_finance_utm',
        'Meta JSON' => '_savol_finance_meta',
        'Payload completo' => '_savol_finance_payload',
    ];

    foreach ($json_blocks as $label => $meta_key) {
        $value = (string) get_post_meta($post->ID, $meta_key, true);
        echo '<p><strong>' . esc_html($label) . '</strong></p>';
        echo '<textarea readonly rows="8" style="width:100%;font-family:monospace;">' . esc_textarea($value) . '</textarea>';
    }
}

function savol_financing_decode_json_meta(int $post_id, string $meta_key): array
{
    $raw = (string) get_post_meta($post_id, $meta_key, true);
    if ($raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function savol_financing_absolute_public_url(string $url, int $post_id = 0): string
{
    $url = trim($url);
    if ($url === '') {
        return '';
    }

    if (preg_match('#^https?://#i', $url)) {
        return esc_url_raw($url);
    }

    if (str_starts_with($url, '//')) {
        return esc_url_raw('https:' . $url);
    }

    if (str_starts_with($url, '/')) {
        $meta = $post_id > 0 ? savol_financing_decode_json_meta($post_id, '_savol_finance_meta') : [];
        $page_url = isset($meta['page_url']) ? (string) $meta['page_url'] : '';
        $origin = SAVOL_FINANCING_PUBLIC_SITE_URL;
        if ($page_url !== '') {
            $scheme = wp_parse_url($page_url, PHP_URL_SCHEME);
            $host = wp_parse_url($page_url, PHP_URL_HOST);
            if (is_string($scheme) && is_string($host) && $host !== '') {
                $origin = $scheme . '://' . $host;
            }
        }

        return esc_url_raw(untrailingslashit($origin) . $url);
    }

    return '';
}

function savol_financing_is_image_url(string $url): bool
{
    $path = (string) wp_parse_url($url, PHP_URL_PATH);
    return preg_match('/\.(jpe?g|png|webp|gif)$/i', $path) === 1;
}

function savol_financing_collect_photo_urls($value, array &$urls, int $post_id, string $context_key = ''): void
{
    if (count($urls) >= 12) {
        return;
    }

    if (is_string($value)) {
        $key = strtolower($context_key);
        $looks_like_photo_field = preg_match('/image|imagem|photo|foto|gallery|galeria|thumb|vehicleimagem/', $key) === 1;
        $absolute = savol_financing_absolute_public_url($value, $post_id);
        if ($looks_like_photo_field && $absolute !== '' && savol_financing_is_image_url($absolute)) {
            $urls[] = $absolute;
        }
        return;
    }

    if (!is_array($value)) {
        return;
    }

    foreach ($value as $key => $item) {
        $child_key = preg_match('/image|imagem|photo|foto|gallery|galeria|thumb|vehicleimagem/', strtolower($context_key)) === 1
            ? $context_key
            : (string) $key;
        savol_financing_collect_photo_urls($item, $urls, $post_id, $child_key);
        if (count($urls) >= 12) {
            return;
        }
    }
}

function savol_financing_get_vehicle_photo_urls(int $post_id): array
{
    $urls = [];
    savol_financing_collect_photo_urls(savol_financing_decode_json_meta($post_id, '_savol_finance_vehicle'), $urls, $post_id);
    savol_financing_collect_photo_urls(savol_financing_decode_json_meta($post_id, '_savol_finance_payload'), $urls, $post_id);

    return array_values(array_unique(array_filter($urls)));
}

function savol_financing_export_pdf(): void
{
    $lead_id = isset($_GET['lead_id']) ? absint($_GET['lead_id']) : 0;
    if ($lead_id <= 0 || get_post_type($lead_id) !== SAVOL_FINANCING_LEAD_POST_TYPE) {
        wp_die('Lead invalido.', 'Financiamento', ['response' => 404]);
    }

    if (!current_user_can('edit_post', $lead_id) && !current_user_can('savol_access_dashboard')) {
        wp_die('Sem permissao.', 'Financiamento', ['response' => 403]);
    }

    check_admin_referer('savol_financing_export_pdf_' . $lead_id);

    $vehicle = savol_financing_decode_json_meta($lead_id, '_savol_finance_vehicle');
    $photos = savol_financing_get_vehicle_photo_urls($lead_id);
    $protocol = (string) get_post_meta($lead_id, '_savol_finance_protocol', true);
    $message = trim((string) get_post_field('post_content', $lead_id));

    $lead_rows = [
        'Nome' => (string) get_post_meta($lead_id, '_savol_finance_name', true),
        'Telefone' => (string) get_post_meta($lead_id, '_savol_finance_phone', true),
        'E-mail' => (string) get_post_meta($lead_id, '_savol_finance_email', true),
        'CPF' => (string) get_post_meta($lead_id, '_savol_finance_cpf', true),
        'Unidade' => (string) get_post_meta($lead_id, '_savol_finance_unit', true),
    ];
    $vehicle_rows = [
        'Veiculo' => (string) get_post_meta($lead_id, '_savol_finance_vehicle_name', true),
        'Marca' => (string) ($vehicle['brand'] ?? ''),
        'Modelo' => (string) ($vehicle['model'] ?? ''),
        'Versao' => (string) ($vehicle['version'] ?? $vehicle['subtitle'] ?? ''),
        'Ano' => (string) ($vehicle['year'] ?? ''),
        'KM' => (string) ($vehicle['km'] ?? ''),
        'Cor' => (string) ($vehicle['color'] ?? ''),
        'Preco' => (string) ($vehicle['price'] ?? ''),
        'Loja do veiculo' => (string) ($vehicle['store'] ?? ''),
        'Pagina' => (string) ($vehicle['url'] ?? ''),
    ];

    nocache_headers();
    header('Content-Type: text/html; charset=' . get_option('blog_charset'));
    ?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <title><?php echo esc_html($protocol ?: 'Lead financiamento'); ?></title>
    <style>
        :root { color-scheme: light; }
        body { margin: 0; background: #eef2f7; color: #12213a; font-family: Arial, sans-serif; }
        .page { max-width: 980px; margin: 28px auto; background: #fff; border-radius: 18px; box-shadow: 0 18px 50px rgba(15,23,42,.12); overflow: hidden; }
        .hero { background: #0f172a; color: #fff; padding: 30px 34px; display: flex; justify-content: space-between; gap: 24px; }
        .hero small { color: #93c5fd; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .hero h1 { margin: 8px 0 0; font-size: 28px; }
        .hero p { margin: 8px 0 0; color: #cbd5e1; }
        .actions { padding: 18px 34px; border-bottom: 1px solid #e5e7eb; }
        .actions button { background: #2563eb; border: 0; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 700; padding: 10px 16px; }
        .content { padding: 28px 34px 34px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
        .card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .card h2 { margin: 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 15px; padding: 13px 16px; text-transform: uppercase; letter-spacing: .04em; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #edf2f7; font-size: 13px; padding: 10px 14px; text-align: left; vertical-align: top; }
        th { color: #64748b; width: 34%; }
        td { color: #0f172a; word-break: break-word; }
        .full { margin-top: 20px; }
        .message { white-space: pre-wrap; padding: 16px; line-height: 1.5; }
        .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 16px; }
        .photos img { width: 100%; height: 230px; object-fit: cover; border-radius: 10px; border: 1px solid #dbe3ef; }
        @media print {
            body { background: #fff; }
            .page { margin: 0; max-width: none; border-radius: 0; box-shadow: none; }
            .actions { display: none; }
            .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .card { break-inside: avoid; }
            .photos img { height: 180px; }
        }
    </style>
</head>
<body>
    <main class="page">
        <header class="hero">
            <div>
                <small>SAVOL Seminovos</small>
                <h1>Lead de financiamento</h1>
                <p><?php echo esc_html($protocol); ?></p>
            </div>
            <div>
                <small>Recebido em</small>
                <p><?php echo esc_html((string) get_post_meta($lead_id, '_savol_finance_received_at', true)); ?></p>
            </div>
        </header>
        <div class="actions"><button type="button" onclick="window.print()">Imprimir / salvar PDF</button></div>
        <section class="content">
            <div class="grid">
                <article class="card">
                    <h2>Cliente</h2>
                    <table><tbody>
                    <?php foreach ($lead_rows as $label => $value) : ?>
                        <tr><th><?php echo esc_html($label); ?></th><td><?php echo esc_html($value !== '' ? $value : '-'); ?></td></tr>
                    <?php endforeach; ?>
                    </tbody></table>
                </article>
                <article class="card">
                    <h2>Veiculo</h2>
                    <table><tbody>
                    <?php foreach ($vehicle_rows as $label => $value) : ?>
                        <tr><th><?php echo esc_html($label); ?></th><td><?php echo esc_html($value !== '' ? $value : '-'); ?></td></tr>
                    <?php endforeach; ?>
                    </tbody></table>
                </article>
            </div>
            <?php if ($message !== '') : ?>
                <article class="card full"><h2>Mensagem</h2><div class="message"><?php echo esc_html($message); ?></div></article>
            <?php endif; ?>
            <?php if (!empty($photos)) : ?>
                <article class="card full"><h2>Fotos do veiculo</h2><div class="photos">
                <?php foreach ($photos as $photo_url) : ?>
                    <img src="<?php echo esc_url($photo_url); ?>" alt="">
                <?php endforeach; ?>
                </div></article>
            <?php endif; ?>
        </section>
    </main>
    <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 350); });</script>
</body>
</html>
    <?php
    exit;
}

function savol_financing_render_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    $token_from_constant = defined('SAVOL_FINANCING_LEADS_TOKEN');
    $token = savol_financing_get_expected_token();
    ?>
    <div class="wrap">
        <h1>SAVOL Financiamento</h1>
        <p>Use este token tambem na variavel de ambiente <code>SAVOL_FINANCE_LEADS_TOKEN</code> da Vercel.</p>

        <?php if ($token_from_constant) : ?>
            <p><strong>Token definido no wp-config.php.</strong></p>
            <p><code><?php echo esc_html($token); ?></code></p>
        <?php else : ?>
            <form method="post" action="options.php">
                <?php settings_fields('savol_financing_leads_settings'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="savol_financing_leads_token">Token da API</label></th>
                        <td>
                            <input
                                type="text"
                                class="regular-text"
                                id="savol_financing_leads_token"
                                name="<?php echo esc_attr(SAVOL_FINANCING_LEADS_TOKEN_OPTION); ?>"
                                value="<?php echo esc_attr($token); ?>"
                                autocomplete="off"
                            />
                            <p class="description">Este token deve ser igual ao cadastrado na Vercel.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Salvar token'); ?>
            </form>
        <?php endif; ?>

        <h2>Endpoint</h2>
        <p><code><?php echo esc_html(rest_url('savol/v1/financiamento-leads')); ?></code></p>
    </div>
    <?php
}

endif;


