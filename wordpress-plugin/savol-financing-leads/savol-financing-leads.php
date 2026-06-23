<?php
/**
 * Plugin Name: Savol Financing Leads API
 * Description: Recebe e armazena leads de financiamento gerados pelo site headless Savol Seminovos.
 * Version: 0.1.0
 * Author: Savol
 */

if (!defined('ABSPATH')) {
    exit;
}

const SAVOL_FINANCING_LEAD_POST_TYPE = 'savol_finance_lead';
const SAVOL_FINANCING_LEADS_TOKEN_OPTION = 'savol_financing_leads_token';

register_activation_hook(__FILE__, 'savol_financing_activate');

add_action('init', 'savol_financing_register_post_type');
add_action('rest_api_init', 'savol_financing_register_rest_routes');
add_action('admin_menu', 'savol_financing_register_settings_page');
add_action('admin_init', 'savol_financing_register_settings');
add_action('add_meta_boxes', 'savol_financing_register_meta_boxes');
add_filter('manage_savol_finance_lead_posts_columns', 'savol_financing_admin_columns');
add_action('manage_savol_finance_lead_posts_custom_column', 'savol_financing_admin_column_content', 10, 2);

function savol_financing_activate(): void
{
    if (!get_option(SAVOL_FINANCING_LEADS_TOKEN_OPTION)) {
        update_option(SAVOL_FINANCING_LEADS_TOKEN_OPTION, wp_generate_password(48, false, false), false);
    }

    savol_financing_register_post_type();
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
        'capability_type' => 'post',
        'capabilities' => [
            'create_posts' => 'do_not_allow',
        ],
        'map_meta_cap' => true,
        'supports' => ['title', 'editor'],
    ]);
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
        'Savol Financiamento',
        'Savol Financiamento',
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
    $unit_name = sanitize_text_field($lead['unitName'] ?? '');
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

function savol_financing_render_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    $token_from_constant = defined('SAVOL_FINANCING_LEADS_TOKEN');
    $token = savol_financing_get_expected_token();
    ?>
    <div class="wrap">
        <h1>Savol Financiamento</h1>
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
