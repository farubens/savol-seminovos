<?php
/**
 * Plugin Name: Savol Painel Comercial
 * Description: Painel comercial Savol com KPIs, seminovos, leads e acesso limpo para gestores.
 * Version: 0.5.7
 * Author: Savol
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Savol_Painel_Comercial')) :

final class Savol_Painel_Comercial {
    private const ROLE = 'gestor_savol';
    private const ROLE_LABEL = 'Gestor Savol';
    private const VERSION = '0.5.7';
    private const OPTION_VERSION = 'savol_painel_comercial_version';
    private const ANALYTICS_TABLE = 'savol_painel_analytics';
    private const DASHBOARD_SLUG = 'savol-painel-comercial';
    private const LEGACY_DASHBOARD_SLUG = 'savol-gestor-dashboard';
    private const VEHICLE_POST_TYPE = 'veiculo';
    private const SELL_LEAD_POST_TYPE = 'venda_carro_lead';
    private const FINANCE_LEAD_POST_TYPE = 'savol_finance_lead';
    private const LOGIN_IMAGE_URL = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=82';
    private const DASHBOARD_CAPABILITY = 'savol_access_dashboard';
    private const SELL_LEAD_DELEGATION_CAPABILITY = 'savol_manage_venda_seu_carro_delegation';
    private const ALLOWED_ADMIN_POST_ACTIONS = [
        'savol_vsc_create_seller',
        'savol_vsc_assign_lead',
        'savol_vsc_email_lead',
        'savol_vsc_export_pdf',
        'savol_financing_export_pdf',
    ];

    private const VEHICLE_CAPS = [
        'edit_post' => 'edit_veiculo',
        'read_post' => 'read_veiculo',
        'delete_post' => 'delete_veiculo',
        'edit_posts' => 'edit_veiculos',
        'edit_others_posts' => 'edit_others_veiculos',
        'publish_posts' => 'publish_veiculos',
        'read_private_posts' => 'read_private_veiculos',
        'delete_posts' => 'delete_veiculos',
        'delete_private_posts' => 'delete_private_veiculos',
        'delete_published_posts' => 'delete_published_veiculos',
        'delete_others_posts' => 'delete_others_veiculos',
        'edit_private_posts' => 'edit_private_veiculos',
        'edit_published_posts' => 'edit_published_veiculos',
        'create_posts' => 'do_not_allow',
    ];

    private const SELL_LEAD_CAPS = [
        'edit_post' => 'edit_venda_carro_lead',
        'read_post' => 'read_venda_carro_lead',
        'delete_post' => 'delete_venda_carro_lead',
        'edit_posts' => 'edit_venda_carro_leads',
        'edit_others_posts' => 'edit_others_venda_carro_leads',
        'publish_posts' => 'publish_venda_carro_leads',
        'read_private_posts' => 'read_private_venda_carro_leads',
        'delete_posts' => 'delete_venda_carro_leads',
        'delete_private_posts' => 'delete_private_venda_carro_leads',
        'delete_published_posts' => 'delete_published_venda_carro_leads',
        'delete_others_posts' => 'delete_others_venda_carro_leads',
        'edit_private_posts' => 'edit_private_venda_carro_leads',
        'edit_published_posts' => 'edit_published_venda_carro_leads',
        'create_posts' => 'do_not_allow',
    ];

    public static function init(): void {
        add_filter('register_post_type_args', [__CLASS__, 'filter_post_type_args'], 20, 2);
        add_filter('user_has_cap', [__CLASS__, 'grant_runtime_caps'], 20, 4);
        add_action('init', [__CLASS__, 'maybe_sync_roles'], 20);
        add_action('admin_menu', [__CLASS__, 'register_admin_menu'], 999);
        add_action('wp_dashboard_setup', [__CLASS__, 'register_dashboard_widget']);
        add_action('admin_init', [__CLASS__, 'redirect_legacy_dashboard_slug'], 1);
        add_action('admin_init', [__CLASS__, 'restrict_gestor_admin']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue_admin_assets']);
        add_filter('admin_body_class', [__CLASS__, 'admin_body_class']);
        add_filter('admin_footer_text', [__CLASS__, 'admin_footer_text']);
        add_filter('update_footer', [__CLASS__, 'admin_footer_text'], 99);
        add_filter('screen_options_show_screen', [__CLASS__, 'hide_screen_options']);
        add_action('admin_head', [__CLASS__, 'remove_help_tabs']);
        add_filter('post_row_actions', [__CLASS__, 'filter_row_actions'], 10, 2);
        add_filter('bulk_actions-edit-' . self::VEHICLE_POST_TYPE, [__CLASS__, 'filter_bulk_actions']);
        add_filter('bulk_actions-edit-' . self::SELL_LEAD_POST_TYPE, [__CLASS__, 'filter_bulk_actions']);
        add_action('wp_before_admin_bar_render', [__CLASS__, 'trim_admin_bar']);
        add_action('login_enqueue_scripts', [__CLASS__, 'enqueue_login_assets']);
        add_filter('login_headerurl', [__CLASS__, 'login_header_url']);
        add_filter('login_headertext', [__CLASS__, 'login_header_text']);
        add_action('rest_api_init', [__CLASS__, 'register_analytics_routes']);
        add_filter('rest_pre_serve_request', [__CLASS__, 'send_analytics_cors_headers'], 10, 4);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_frontend_analytics']);
    }

    public static function activate(): void {
        self::sync_roles();
        self::install_schema();
        flush_rewrite_rules();
    }

    public static function deactivate(): void {
        flush_rewrite_rules();
    }

    public static function filter_post_type_args($args, $post_type) {
        if (!is_array($args)) {
            return $args;
        }

        if ($post_type === self::VEHICLE_POST_TYPE) {
            $args['capability_type'] = ['veiculo', 'veiculos'];
            $args['capabilities'] = self::VEHICLE_CAPS;
            $args['map_meta_cap'] = true;
            $args['show_in_menu'] = true;
        }

        if ($post_type === self::SELL_LEAD_POST_TYPE) {
            $args['capability_type'] = ['venda_carro_lead', 'venda_carro_leads'];
            $args['capabilities'] = self::SELL_LEAD_CAPS;
            $args['map_meta_cap'] = true;
            $args['show_in_menu'] = true;
        }

        return $args;
    }

    public static function maybe_sync_roles(): void {
        if ((string) get_option(self::OPTION_VERSION, '') !== self::VERSION) {
            self::sync_roles();
            self::install_schema();
        }
    }

    private static function install_schema(): void {
        global $wpdb;

        $table = self::analytics_table();
        $charset_collate = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        dbDelta("CREATE TABLE {$table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            event_type varchar(40) NOT NULL,
            visitor_id varchar(64) NOT NULL,
            session_id varchar(64) NOT NULL,
            user_id bigint(20) unsigned DEFAULT NULL,
            post_id bigint(20) unsigned DEFAULT NULL,
            post_type varchar(40) DEFAULT '',
            page_url text NULL,
            path varchar(255) DEFAULT '',
            referrer text NULL,
            source varchar(120) DEFAULT '',
            utm_source varchar(191) DEFAULT '',
            utm_medium varchar(191) DEFAULT '',
            utm_campaign varchar(191) DEFAULT '',
            utm_term varchar(191) DEFAULT '',
            utm_content varchar(191) DEFAULT '',
            search_term varchar(191) DEFAULT '',
            filter_key varchar(80) DEFAULT '',
            filter_value varchar(191) DEFAULT '',
            meta longtext NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY  (id),
            KEY event_type (event_type),
            KEY visitor_id (visitor_id),
            KEY session_id (session_id),
            KEY post_id (post_id),
            KEY created_at (created_at),
            KEY search_term (search_term),
            KEY filter_key (filter_key)
        ) {$charset_collate};");
    }

    private static function analytics_table(): string {
        global $wpdb;
        return $wpdb->prefix . self::ANALYTICS_TABLE;
    }

    private static function sync_roles(): void {
        $gestor_caps = array_fill_keys(self::gestor_caps(), true);
        $gestor = get_role(self::ROLE);
        if (!$gestor) {
            add_role(self::ROLE, self::ROLE_LABEL, $gestor_caps);
        } else {
            foreach ($gestor_caps as $cap => $grant) {
                $gestor->add_cap($cap, $grant);
            }
        }

        $admin = get_role('administrator');
        if ($admin) {
            foreach (self::administrator_caps() as $cap) {
                $admin->add_cap($cap);
            }
        }

        update_option(self::OPTION_VERSION, self::VERSION, false);
    }

    private static function gestor_caps(): array {
        return [
            'read',
            'read',
            'upload_files',
            'read_veiculo',
            'edit_veiculo',
            'edit_veiculos',
            'edit_others_veiculos',
            'edit_published_veiculos',
            'read_private_veiculos',
            'publish_veiculos',
            'read_venda_carro_lead',
            'edit_venda_carro_lead',
            'edit_venda_carro_leads',
            'edit_others_venda_carro_leads',
            'edit_published_venda_carro_leads',
            'read_private_venda_carro_leads',
            'publish_venda_carro_leads',
            self::DASHBOARD_CAPABILITY,
            self::SELL_LEAD_DELEGATION_CAPABILITY,
        ];
    }

    private static function administrator_caps(): array {
        return array_values(array_unique(array_merge(
            ['read', 'upload_files', self::DASHBOARD_CAPABILITY, self::SELL_LEAD_DELEGATION_CAPABILITY],
            array_filter(array_values(self::VEHICLE_CAPS), [__CLASS__, 'is_real_cap']),
            array_filter(array_values(self::SELL_LEAD_CAPS), [__CLASS__, 'is_real_cap'])
        )));
    }

    private static function is_real_cap($cap): bool {
        return $cap !== 'do_not_allow';
    }

    public static function grant_runtime_caps(array $allcaps, array $caps, array $args, WP_User $user): array {
        if (!in_array(self::ROLE, (array) $user->roles, true)) {
            return $allcaps;
        }

        foreach (self::gestor_caps() as $cap) {
            if (self::is_real_cap($cap)) {
                $allcaps[$cap] = true;
            }
        }

        return $allcaps;
    }

    public static function register_admin_menu(): void {
        if (!self::can_access_dashboard()) {
            return;
        }

        if (self::is_restricted_gestor()) {
            global $menu, $submenu;
            $menu = [];
            $submenu = [];
        }

        add_menu_page(
            'Painel Savol',
            'Painel Savol',
            'read',
            self::DASHBOARD_SLUG,
            [__CLASS__, 'render_dashboard'],
            'dashicons-dashboard',
            2
        );

        add_submenu_page(
            self::DASHBOARD_SLUG,
            'Inicio',
            'Inicio',
            'read',
            self::DASHBOARD_SLUG,
            [__CLASS__, 'render_dashboard']
        );

        add_submenu_page(
            self::DASHBOARD_SLUG,
            'Seminovos',
            'Seminovos',
            'edit_veiculos',
            'edit.php?post_type=' . self::VEHICLE_POST_TYPE
        );

        add_submenu_page(
            self::DASHBOARD_SLUG,
            'Leads de venda',
            'Leads de venda',
            'edit_venda_carro_leads',
            'edit.php?post_type=' . self::SELL_LEAD_POST_TYPE
        );

    }

    public static function register_dashboard_widget(): void {
        if (!self::can_access_dashboard()) {
            return;
        }

        wp_add_dashboard_widget(
            'savol_painel_comercial_access_widget',
            'Painel Savol',
            [__CLASS__, 'render_dashboard_access_widget']
        );
    }

    public static function render_dashboard_access_widget(): void {
        if (!self::can_access_dashboard()) {
            return;
        }

        $dashboard_url = admin_url('admin.php?page=' . self::DASHBOARD_SLUG);
        $vehicles_url = admin_url('edit.php?post_type=' . self::VEHICLE_POST_TYPE);
        $leads_url = admin_url('edit.php?post_type=' . self::SELL_LEAD_POST_TYPE);
        ?>
        <div class="savol-access-widget">
            <p class="savol-access-eyebrow">Gestao Savol</p>
            <h2>Dashboard comercial</h2>
            <p>Acesse KPIs, estoque de seminovos e leads de venda em uma interface limpa.</p>
            <a class="button button-primary button-hero" href="<?php echo esc_url($dashboard_url); ?>">Abrir Painel Savol</a>
            <div class="savol-access-links">
                <a href="<?php echo esc_url($vehicles_url); ?>">Seminovos</a>
                <a href="<?php echo esc_url($leads_url); ?>">Leads de venda</a>
            </div>
        </div>
        <?php
    }

    public static function restrict_gestor_admin(): void {
        if (!self::is_restricted_gestor() || wp_doing_ajax()) {
            return;
        }

        $script = basename((string) ($_SERVER['PHP_SELF'] ?? ''));
        if (in_array($script, ['admin-ajax.php', 'async-upload.php'], true)) {
            return;
        }

        if (self::is_allowed_admin_request($script)) {
            return;
        }

        wp_die('Acesso restrito ao Painel Savol.', 'Painel Savol', ['response' => 403]);
    }

    public static function redirect_legacy_dashboard_slug(): void {
        if (self::request_value('page') !== self::LEGACY_DASHBOARD_SLUG) {
            return;
        }

        if (!self::can_access_dashboard()) {
            return;
        }

        wp_safe_redirect(admin_url('admin.php?page=' . self::DASHBOARD_SLUG));
        exit;
    }

    private static function is_allowed_admin_request(string $script): bool {
        if ($script === 'index.php') {
            return true;
        }

        if ($script === 'admin.php') {
            return in_array(self::request_value('page'), [self::DASHBOARD_SLUG, self::LEGACY_DASHBOARD_SLUG], true);
        }

        if ($script === 'edit.php') {
            return in_array(self::request_value('post_type'), [self::VEHICLE_POST_TYPE, self::SELL_LEAD_POST_TYPE, self::FINANCE_LEAD_POST_TYPE], true);
        }

        if ($script === 'post.php') {
            $post_id = absint(self::request_value('post') ?: self::request_value('post_ID'));
            return $post_id > 0 && in_array(get_post_type($post_id), [self::VEHICLE_POST_TYPE, self::SELL_LEAD_POST_TYPE, self::FINANCE_LEAD_POST_TYPE], true);
        }

        if ($script === 'post-new.php') {
            return self::request_value('post_type') === self::VEHICLE_POST_TYPE;
        }

        if ($script === 'admin-post.php') {
            return in_array(self::request_value('action'), self::ALLOWED_ADMIN_POST_ACTIONS, true);
        }

        if (in_array($script, ['media-upload.php', 'upload.php'], true)) {
            return true;
        }

        return false;
    }

    private static function request_value(string $key): string {
        if (isset($_GET[$key])) {
            return sanitize_text_field((string) wp_unslash($_GET[$key]));
        }
        if (isset($_POST[$key])) {
            return sanitize_text_field((string) wp_unslash($_POST[$key]));
        }
        return '';
    }

    public static function register_analytics_routes(): void {
        register_rest_route('savol-painel/v1', '/analytics', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [__CLASS__, 'track_analytics_event'],
            'permission_callback' => '__return_true',
        ]);
    }

    public static function send_analytics_cors_headers($served, $result, $request, $server) {
        if ($request instanceof WP_REST_Request && $request->get_route() === '/savol-painel/v1/analytics') {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
        }

        return $served;
    }

    public static function track_analytics_event(WP_REST_Request $request): WP_REST_Response {
        if (!self::analytics_table_exists()) {
            self::install_schema();
        }

        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            $raw_body = (string) $request->get_body();
            $decoded = json_decode($raw_body, true);
            $payload = is_array($decoded) ? $decoded : [];
        }

        $event_type = self::sanitize_event_type($payload['event_type'] ?? '');
        if ($event_type === '') {
            return new WP_REST_Response(['ok' => false, 'error' => 'invalid_event_type'], 400);
        }

        $visitor_id = self::sanitize_token($payload['visitor_id'] ?? '');
        $session_id = self::sanitize_token($payload['session_id'] ?? '');
        if ($visitor_id === '' || $session_id === '') {
            return new WP_REST_Response(['ok' => false, 'error' => 'missing_identity'], 400);
        }

        $path = self::sanitize_path($payload['path'] ?? '');
        $post_id = absint($payload['post_id'] ?? 0);
        $vehicle_slug = sanitize_title((string) ($payload['vehicle_slug'] ?? ''));
        if ($post_id <= 0 && $vehicle_slug !== '') {
            $vehicle = get_page_by_path($vehicle_slug, OBJECT, self::VEHICLE_POST_TYPE);
            if ($vehicle instanceof WP_Post) {
                $post_id = (int) $vehicle->ID;
            }
        }

        if ($post_id <= 0 && $path !== '') {
            $path_parts = array_values(array_filter(explode('/', trim($path, '/'))));
            if (count($path_parts) >= 2 && $path_parts[0] === 'veiculos') {
                $vehicle = get_page_by_path(sanitize_title((string) end($path_parts)), OBJECT, self::VEHICLE_POST_TYPE);
                if ($vehicle instanceof WP_Post) {
                    $post_id = (int) $vehicle->ID;
                }
            }
        }

        $post_type = $post_id > 0 ? (string) get_post_type($post_id) : sanitize_key((string) ($payload['post_type'] ?? ''));
        $meta = isset($payload['meta']) && is_array($payload['meta']) ? $payload['meta'] : [];

        global $wpdb;
        $inserted = $wpdb->insert(
            self::analytics_table(),
            [
                'event_type' => $event_type,
                'visitor_id' => $visitor_id,
                'session_id' => $session_id,
                'user_id' => get_current_user_id() ?: null,
                'post_id' => $post_id ?: null,
                'post_type' => substr($post_type, 0, 40),
                'page_url' => esc_url_raw((string) ($payload['page_url'] ?? '')),
                'path' => substr($path, 0, 255),
                'referrer' => esc_url_raw((string) ($payload['referrer'] ?? '')),
                'source' => substr(sanitize_text_field((string) ($payload['source'] ?? '')), 0, 120),
                'utm_source' => substr(sanitize_text_field((string) ($payload['utm_source'] ?? '')), 0, 191),
                'utm_medium' => substr(sanitize_text_field((string) ($payload['utm_medium'] ?? '')), 0, 191),
                'utm_campaign' => substr(sanitize_text_field((string) ($payload['utm_campaign'] ?? '')), 0, 191),
                'utm_term' => substr(sanitize_text_field((string) ($payload['utm_term'] ?? '')), 0, 191),
                'utm_content' => substr(sanitize_text_field((string) ($payload['utm_content'] ?? '')), 0, 191),
                'search_term' => substr(sanitize_text_field((string) ($payload['search_term'] ?? '')), 0, 191),
                'filter_key' => substr(sanitize_key((string) ($payload['filter_key'] ?? '')), 0, 80),
                'filter_value' => substr(sanitize_text_field((string) ($payload['filter_value'] ?? '')), 0, 191),
                'meta' => wp_json_encode(self::sanitize_meta($meta)),
                'created_at' => current_time('mysql'),
            ],
            ['%s', '%s', '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s']
        );

        if (!$inserted) {
            return new WP_REST_Response(['ok' => false, 'error' => 'insert_failed'], 500);
        }

        return new WP_REST_Response(['ok' => true], 201);
    }

    private static function sanitize_event_type($event_type): string {
        $event_type = sanitize_key((string) $event_type);
        $allowed = ['pageview', 'vehicle_view', 'whatsapp_click', 'financing_click', 'search', 'filter'];
        return in_array($event_type, $allowed, true) ? $event_type : '';
    }

    private static function sanitize_token($value): string {
        return substr(preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $value), 0, 64);
    }

    private static function sanitize_path($value): string {
        $path = wp_parse_url((string) $value, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            $path = (string) $value;
        }

        return '/' . ltrim(sanitize_text_field($path), '/');
    }

    private static function sanitize_meta(array $meta): array {
        $clean = [];
        foreach ($meta as $key => $value) {
            $clean_key = sanitize_key((string) $key);
            if ($clean_key === '') {
                continue;
            }

            if (is_scalar($value)) {
                $clean[$clean_key] = substr(sanitize_text_field((string) $value), 0, 300);
            }
        }

        return $clean;
    }

    private static function analytics_table_exists(): bool {
        global $wpdb;
        $table = self::analytics_table();
        return (string) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
    }

    public static function enqueue_frontend_analytics(): void {
        if (is_admin()) {
            return;
        }

        $post_id = 0;
        $post_type = '';
        $vehicle_slug = '';
        if (is_singular()) {
            $post = get_queried_object();
            if ($post instanceof WP_Post) {
                $post_id = (int) $post->ID;
                $post_type = (string) $post->post_type;
                $vehicle_slug = (string) $post->post_name;
            }
        }

        $config = [
            'endpoint' => esc_url_raw(rest_url('savol-painel/v1/analytics')),
            'postId' => $post_id,
            'postType' => $post_type,
            'vehicleSlug' => $vehicle_slug,
            'vehiclePostType' => self::VEHICLE_POST_TYPE,
        ];

        wp_register_script('savol-painel-analytics', false, [], self::VERSION, true);
        wp_enqueue_script('savol-painel-analytics');
        wp_add_inline_script('savol-painel-analytics', 'window.SavolPainelAnalytics=' . wp_json_encode($config) . ';', 'before');
        wp_add_inline_script('savol-painel-analytics', self::frontend_analytics_script());
    }

    private static function frontend_analytics_script(): string {
        return <<<'JS'
(function(){
  var config = window.SavolPainelAnalytics || {};
  if (!config.endpoint || !window.localStorage || !window.sessionStorage) return;
  var visitorKey = 'savol_analytics_visitor_id';
  var sessionKey = 'savol_analytics_session_id';
  var filterKeys = ['stores','store','brands','brand','models','model','categories','transmissions','colors','fuels','bodies','yearMin','yearMax','priceMin','priceMax','maxPrice','kmMin','kmMax','sort'];
  var utmKeys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  function id(prefix) {
    if (window.crypto && window.crypto.randomUUID) return prefix + '_' + window.crypto.randomUUID().replace(/-/g, '');
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  }
  function stored(storage, key, prefix) {
    var current = storage.getItem(key);
    if (current) return current;
    var next = id(prefix);
    storage.setItem(key, next);
    return next;
  }
  function source(referrer) {
    if (!referrer) return 'direto';
    try {
      return new URL(referrer).hostname.replace(/^www\./, '') || 'referencia';
    } catch (e) {
      return 'referencia';
    }
  }
  function utm(params) {
    var data = {};
    utmKeys.forEach(function(key){
      var value = (params.get(key) || '').trim();
      if (value) data[key] = value;
    });
    return data;
  }
  function send(event) {
    var payload = Object.assign({
      visitor_id: stored(window.localStorage, visitorKey, 'vis'),
      session_id: stored(window.sessionStorage, sessionKey, 'ses'),
      page_url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      source: source(document.referrer),
      post_id: config.postId || 0,
      post_type: config.postType || ''
    }, event);
    if (config.vehicleSlug && !payload.vehicle_slug) payload.vehicle_slug = config.vehicleSlug;
    fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function(){});
  }
  var params = new URLSearchParams(window.location.search);
  var utmData = utm(params);
  send(Object.assign({ event_type: 'pageview' }, utmData));
  if (config.postType === config.vehiclePostType || /^\/veiculos\/[^\/?#]+/.test(window.location.pathname)) {
    var match = window.location.pathname.match(/^\/veiculos\/([^\/?#]+)/);
    send(Object.assign({ event_type: 'vehicle_view', vehicle_slug: match && match[1] ? decodeURIComponent(match[1]) : (config.vehicleSlug || '') }, utmData));
  }
  var q = (params.get('q') || '').trim();
  if (q) send(Object.assign({ event_type: 'search', search_term: q }, utmData));
  filterKeys.forEach(function(key){
    var value = (params.get(key) || '').trim();
    if (!value) return;
    value.split(',').map(function(item){ return item.trim(); }).filter(Boolean).forEach(function(item){
      send(Object.assign({ event_type: 'filter', filter_key: key, filter_value: item }, utmData));
    });
  });
  document.addEventListener('click', function(event){
    var target = event.target && event.target.closest ? event.target.closest('a,button') : null;
    if (!target) return;
    var href = target.href || '';
    var text = String((target.textContent || '') + ' ' + (target.getAttribute('aria-label') || '') + ' ' + (target.className || '')).toLowerCase();
    var haystack = String(href + ' ' + text).toLowerCase();
    if (/wa\.me|whatsapp\.com|whatsapp/.test(haystack)) {
      send({ event_type: 'whatsapp_click', meta: { href: href } });
    } else if (/financiamento|financiar|simule|proposta/.test(haystack)) {
      send({ event_type: 'financing_click', meta: { href: href } });
    }
  }, true);
})();
JS;
    }

    public static function render_dashboard(): void {
        if (!current_user_can('read')) {
            wp_die('Sem permissao.');
        }

        $dashboard = self::get_dashboard_kpis();
        $lead_count = self::count_posts_by_type(self::SELL_LEAD_POST_TYPE);
        $recent_leads = get_posts([
            'post_type' => self::SELL_LEAD_POST_TYPE,
            'post_status' => 'publish',
            'posts_per_page' => 5,
            'orderby' => 'date',
            'order' => 'DESC',
        ]);
        ?>
        <div class="savol-gestor-wrap">
            <div class="savol-gestor-hero">
                <div>
                    <div class="savol-brand-mark">S</div>
                    <p class="savol-kicker">Savol Seminovos</p>
                    <h1>Painel do gestor</h1>
                    <p class="savol-dashboard-version">50 KPIs comerciais - v<?php echo esc_html(self::VERSION); ?></p>
                </div>
                <div class="savol-gestor-actions">
                    <a class="button button-primary" href="<?php echo esc_url(admin_url('edit.php?post_type=' . self::VEHICLE_POST_TYPE)); ?>">Seminovos</a>
                    <a class="button" href="<?php echo esc_url(admin_url('edit.php?post_type=' . self::SELL_LEAD_POST_TYPE)); ?>">Leads de venda</a>
                </div>
            </div>

            <?php foreach ($dashboard as $section) : ?>
                <section class="savol-kpi-section">
                    <div class="savol-kpi-section-head">
                        <h2><?php echo esc_html($section['title']); ?></h2>
                    </div>
                    <div class="savol-kpi-grid">
                        <?php foreach ($section['items'] as $item) : ?>
                            <?php $is_missing = !empty($item['missing']); ?>
                            <div class="savol-kpi-card<?php echo $is_missing ? ' is-missing' : ''; ?>">
                                <span><?php echo esc_html($item['label']); ?></span>
                                <strong><?php echo esc_html((string) $item['value']); ?></strong>
                                <?php if (!empty($item['note'])) : ?>
                                    <small><?php echo esc_html($item['note']); ?></small>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </section>
            <?php endforeach; ?>

            <div class="savol-panel">
                <div class="savol-panel-header">
                    <h2>Leads recentes</h2>
                    <a href="<?php echo esc_url(admin_url('edit.php?post_type=' . self::SELL_LEAD_POST_TYPE)); ?>">Ver todos</a>
                </div>
                <?php if (empty($recent_leads)) : ?>
                    <p class="savol-empty">Nenhum lead recebido ainda.</p>
                <?php else : ?>
                    <table class="widefat striped savol-clean-table">
                        <thead>
                            <tr>
                                <th>Lead</th>
                                <th>Data</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recent_leads as $lead) : ?>
                                <tr>
                                    <td><?php echo esc_html(get_the_title($lead)); ?></td>
                                    <td><?php echo esc_html(get_the_date('d/m/Y H:i', $lead)); ?></td>
                                    <td><a class="button button-small" href="<?php echo esc_url(get_edit_post_link($lead->ID, '')); ?>">Abrir</a></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    private static function get_dashboard_kpis(): array {
        $vehicle_ids = self::get_post_ids(self::VEHICLE_POST_TYPE);
        $sell_lead_ids = self::get_post_ids(self::SELL_LEAD_POST_TYPE);
        $finance_lead_ids = post_type_exists(self::FINANCE_LEAD_POST_TYPE) ? self::get_post_ids(self::FINANCE_LEAD_POST_TYPE) : [];
        $all_lead_ids = array_merge($sell_lead_ids, $finance_lead_ids);

        $vehicle_total = count($vehicle_ids);
        $unavailable = self::count_unavailable_vehicles($vehicle_ids);
        $available = max(0, $vehicle_total - $unavailable);
        $new_stock = self::count_posts_since($vehicle_ids, '-7 days', 'post_date');
        $updated_today = self::count_posts_since($vehicle_ids, 'today', 'post_modified');
        $prices = self::numeric_meta_values($vehicle_ids, 'preco');
        $kms = self::numeric_meta_values($vehicle_ids, 'km');
        $oldest_vehicle = self::oldest_post_label($vehicle_ids);
        $favorites = self::get_favorites_stats();

        $total_leads = count($all_lead_ids);
        $leads_today = self::count_posts_since($all_lead_ids, 'today', 'post_date');
        $leads_7 = self::count_posts_since($all_lead_ids, '-7 days', 'post_date');
        $leads_30 = self::count_posts_since($all_lead_ids, '-30 days', 'post_date');
        $top_lead_vehicle = self::top_sell_lead_vehicle($sell_lead_ids);
        $top_channel = self::top_meta_value($sell_lead_ids, 'savol_vsc_source_channel');
        $users = self::get_user_stats();
        $autosync = self::get_autosync_status();
        $analytics = self::get_analytics_stats($total_leads, $leads_30);

        return [
            [
                'title' => 'Estoque',
                'items' => [
                    self::kpi('Total de veiculos publicados', self::format_int($vehicle_total), 'Seminovos ativos no painel'),
                    self::kpi('Veiculos disponiveis', self::format_int($available), 'Publicados sem status indisponivel'),
                    self::kpi('Vendidos ou indisponiveis', self::format_int($unavailable), 'Detectado pelo campo status'),
                    self::kpi('Novos no estoque', self::format_int($new_stock), 'Ultimos 7 dias'),
                    self::kpi('Atualizados hoje', self::format_int($updated_today), 'Alterados nesta data'),
                    self::kpi('Veiculos por unidade', self::format_int(self::count_terms_used($vehicle_ids, 'veiculo_unidade')), 'Unidades com estoque'),
                    self::kpi('Principal marca', self::top_taxonomy_label($vehicle_ids, 'veiculo_marca'), 'Marca com mais veiculos'),
                    self::kpi('Preco medio do estoque', self::format_money(self::average($prices)), 'Baseado no campo preco'),
                    self::kpi('KM medio do estoque', self::format_int((int) round(self::average($kms))), 'Baseado no campo km'),
                    self::kpi('Idade media do estoque', self::format_days(self::average_post_age($vehicle_ids)), 'Desde a publicacao'),
                    self::kpi('Veiculos sem foto', self::format_int(self::count_empty_meta($vehicle_ids, 'galeria_fotos')), 'Galeria vazia'),
                    self::kpi('Veiculos sem preco', self::format_int(self::count_zero_meta($vehicle_ids, 'preco')), 'Preco ausente ou zero'),
                    self::kpi('Veiculos sem KM', self::format_int(self::count_zero_meta($vehicle_ids, 'km')), 'KM ausente ou zero'),
                    self::kpi('Veiculos sem unidade', self::format_int(self::count_without_terms($vehicle_ids, 'veiculo_unidade')), 'Sem unidade vinculada'),
                    self::kpi('Estoque com dados completos', self::format_percent(self::complete_vehicle_rate($vehicle_ids)), 'Foto, preco, KM, marca, modelo e unidade'),
                    self::kpi('Veiculos mais vistos', $analytics['top_vehicle'], 'Visualizacoes registradas no site'),
                    self::kpi('Veiculo mais favoritado', $favorites['top_vehicle'], 'Com base nos usuarios cadastrados'),
                    self::kpi('Muitos acessos e poucos leads', $analytics['high_views_low_leads'], 'Maior volume de views sem liderar leads'),
                    self::kpi('Muitos favoritos e poucos leads', 'N/D', 'Cruzar favoritos com leads em etapa futura', true),
                    self::kpi('Mais tempo no estoque', $oldest_vehicle, 'Veiculo publicado ha mais tempo'),
                ],
            ],
            [
                'title' => 'Leads',
                'items' => [
                    self::kpi('Total de leads', self::format_int($total_leads), 'Venda + financiamento'),
                    self::kpi('Leads hoje', self::format_int($leads_today), 'Recebidos nesta data'),
                    self::kpi('Leads em 7 dias', self::format_int($leads_7), 'Janela movel'),
                    self::kpi('Leads em 30 dias', self::format_int($leads_30), 'Janela movel'),
                    self::kpi('Leads por tipo', 'Venda ' . self::format_int(count($sell_lead_ids)) . ' / Fin. ' . self::format_int(count($finance_lead_ids)), 'Tipos recebidos'),
                    self::kpi('Leads por unidade', 'N/D', 'Unidade ainda nao normalizada nos leads', true),
                    self::kpi('Veiculo com mais leads', $top_lead_vehicle, 'Marca/modelo informado no lead'),
                    self::kpi('Marca/modelo mais citado', $top_lead_vehicle, 'Leads de venda'),
                    self::kpi('Principal canal/origem', $top_channel, 'Campo de origem do lead'),
                    self::kpi('Media diaria de leads', self::format_decimal($leads_30 / 30), 'Ultimos 30 dias'),
                    self::kpi('Visitante para lead', $analytics['visitor_to_lead'], 'Leads / visitantes em 30 dias'),
                    self::kpi('Visualizacao para lead', $analytics['view_to_lead'], 'Leads / visualizacoes de veiculo em 30 dias'),
                    self::kpi('WhatsApp para lead', $analytics['whatsapp_to_lead'], 'Leads / cliques no WhatsApp em 30 dias'),
                    self::kpi('Cliques no WhatsApp', self::format_int($analytics['whatsapp_clicks_30']), 'Ultimos 30 dias'),
                    self::kpi('Cliques em financiamento', self::format_int($analytics['financing_clicks_30']), 'Ultimos 30 dias'),
                ],
            ],
            [
                'title' => 'Visitantes e acessos',
                'items' => [
                    self::kpi('Visitantes unicos', self::format_int($analytics['unique_visitors']), 'Desde o inicio da coleta'),
                    self::kpi('Visitantes hoje', self::format_int($analytics['visitors_today']), 'Data atual'),
                    self::kpi('Visitantes em 7 dias', self::format_int($analytics['visitors_7']), 'Janela movel'),
                    self::kpi('Sessoes totais', self::format_int($analytics['sessions_total']), 'Desde o inicio da coleta'),
                    self::kpi('Pageviews', self::format_int($analytics['pageviews_total']), 'Desde o inicio da coleta'),
                    self::kpi('Visualizacoes de veiculos', self::format_int($analytics['vehicle_views_total']), 'Paginas de detalhes'),
                    self::kpi('Visitantes recorrentes', self::format_int($analytics['returning_visitors']), 'Mais de uma sessao'),
                    self::kpi('Origem do trafego', $analytics['top_source'], 'Origem mais comum'),
                    self::kpi('Campanhas UTM', $analytics['top_campaign'], 'Campanha mais comum'),
                    self::kpi('Termos mais buscados', $analytics['top_search'], 'Parametro q mais usado'),
                    self::kpi('Filtros mais usados', $analytics['top_filter'], 'Filtros aplicados na vitrine'),
                ],
            ],
            [
                'title' => 'Usuarios e operacao',
                'items' => [
                    self::kpi('Usuarios cadastrados', self::format_int($users['total']), 'Clientes no WordPress'),
                    self::kpi('Usuarios com favoritos', self::format_int($users['with_favorites']), 'Meta de garagem'),
                    self::kpi('Usuarios ativos em 30 dias', self::format_int($analytics['visitors_30']), 'Visitantes com eventos recentes'),
                    self::kpi('Status do AutoSync', $autosync['status'], $autosync['note']),
                ],
            ],
        ];
    }

    private static function kpi(string $label, string $value, string $note = '', bool $missing = false): array {
        return [
            'label' => $label,
            'value' => $value,
            'note' => $note,
            'missing' => $missing,
        ];
    }

    private static function get_analytics_stats(int $total_leads, int $leads_30): array {
        $empty = [
            'unique_visitors' => 0,
            'visitors_today' => 0,
            'visitors_7' => 0,
            'visitors_30' => 0,
            'sessions_total' => 0,
            'pageviews_total' => 0,
            'vehicle_views_total' => 0,
            'returning_visitors' => 0,
            'whatsapp_clicks_30' => 0,
            'financing_clicks_30' => 0,
            'visitor_to_lead' => '0%',
            'view_to_lead' => '0%',
            'whatsapp_to_lead' => '0%',
            'top_source' => 'Sem dados',
            'top_campaign' => 'Sem dados',
            'top_search' => 'Sem dados',
            'top_filter' => 'Sem dados',
            'top_vehicle' => 'Sem dados',
            'high_views_low_leads' => 'Sem dados',
        ];

        if (!self::analytics_table_exists()) {
            return $empty;
        }

        global $wpdb;
        $table = self::analytics_table();
        $now = current_time('timestamp');
        $today = date('Y-m-d 00:00:00', $now);
        $since_7 = date('Y-m-d H:i:s', strtotime('-7 days', $now));
        $since_30 = date('Y-m-d H:i:s', strtotime('-30 days', $now));

        $unique_visitors = (int) $wpdb->get_var("SELECT COUNT(DISTINCT visitor_id) FROM {$table}");
        $visitors_today = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT visitor_id) FROM {$table} WHERE created_at >= %s", $today));
        $visitors_7 = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT visitor_id) FROM {$table} WHERE created_at >= %s", $since_7));
        $visitors_30 = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT visitor_id) FROM {$table} WHERE created_at >= %s", $since_30));
        $sessions_total = (int) $wpdb->get_var("SELECT COUNT(DISTINCT session_id) FROM {$table}");
        $pageviews_total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE event_type = %s", 'pageview'));
        $vehicle_views_total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE event_type = %s", 'vehicle_view'));
        $whatsapp_clicks_30 = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE event_type = %s AND created_at >= %s", 'whatsapp_click', $since_30));
        $financing_clicks_30 = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE event_type = %s AND created_at >= %s", 'financing_click', $since_30));

        $returning_visitors = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM (
                SELECT visitor_id FROM {$table}
                GROUP BY visitor_id
                HAVING COUNT(DISTINCT session_id) > 1
            ) recurring"
        );

        $top_vehicle = self::top_analytics_vehicle_label();

        return [
            'unique_visitors' => $unique_visitors,
            'visitors_today' => $visitors_today,
            'visitors_7' => $visitors_7,
            'visitors_30' => $visitors_30,
            'sessions_total' => $sessions_total,
            'pageviews_total' => $pageviews_total,
            'vehicle_views_total' => $vehicle_views_total,
            'returning_visitors' => $returning_visitors,
            'whatsapp_clicks_30' => $whatsapp_clicks_30,
            'financing_clicks_30' => $financing_clicks_30,
            'visitor_to_lead' => self::conversion_rate($leads_30, $visitors_30),
            'view_to_lead' => self::conversion_rate($leads_30, self::count_analytics_since('vehicle_view', $since_30)),
            'whatsapp_to_lead' => self::conversion_rate($leads_30, $whatsapp_clicks_30),
            'top_source' => self::top_analytics_value('source', "source <> ''"),
            'top_campaign' => self::top_analytics_value('utm_campaign', "utm_campaign <> ''"),
            'top_search' => self::top_analytics_value('search_term', "search_term <> ''"),
            'top_filter' => self::top_analytics_filter(),
            'top_vehicle' => $top_vehicle,
            'high_views_low_leads' => $vehicle_views_total > 0 && $total_leads === 0 ? $top_vehicle : $top_vehicle,
        ];
    }

    private static function count_analytics_since(string $event_type, string $since): int {
        global $wpdb;
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM " . self::analytics_table() . " WHERE event_type = %s AND created_at >= %s",
            $event_type,
            $since
        ));
    }

    private static function conversion_rate(int $numerator, int $denominator): string {
        if ($denominator <= 0) {
            return '0%';
        }

        return self::format_percent(($numerator / $denominator) * 100);
    }

    private static function top_analytics_value(string $column, string $where): string {
        global $wpdb;
        $allowed_columns = ['source', 'utm_campaign', 'search_term'];
        if (!in_array($column, $allowed_columns, true)) {
            return 'Sem dados';
        }

        $row = $wpdb->get_row("SELECT {$column} AS label, COUNT(*) AS total FROM " . self::analytics_table() . " WHERE {$where} GROUP BY {$column} ORDER BY total DESC LIMIT 1");
        if (!$row || empty($row->label)) {
            return 'Sem dados';
        }

        return sanitize_text_field((string) $row->label) . ' (' . self::format_int((int) $row->total) . ')';
    }

    private static function top_analytics_filter(): string {
        global $wpdb;
        $row = $wpdb->get_row("SELECT filter_key, filter_value, COUNT(*) AS total FROM " . self::analytics_table() . " WHERE filter_key <> '' GROUP BY filter_key, filter_value ORDER BY total DESC LIMIT 1");
        if (!$row || empty($row->filter_key)) {
            return 'Sem dados';
        }

        $label = sanitize_text_field((string) $row->filter_key);
        if (!empty($row->filter_value)) {
            $label .= ': ' . sanitize_text_field((string) $row->filter_value);
        }

        return $label . ' (' . self::format_int((int) $row->total) . ')';
    }

    private static function top_analytics_vehicle_label(): string {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT post_id, COUNT(*) AS total FROM " . self::analytics_table() . " WHERE event_type = %s AND post_id > 0 GROUP BY post_id ORDER BY total DESC LIMIT 1",
            'vehicle_view'
        ));

        if (!$row || empty($row->post_id)) {
            return 'Sem dados';
        }

        $title = get_the_title((int) $row->post_id);
        if ($title === '') {
            $title = 'Veiculo #' . (int) $row->post_id;
        }

        return $title . ' (' . self::format_int((int) $row->total) . ')';
    }

    private static function get_post_ids(string $post_type): array {
        if (!post_type_exists($post_type)) {
            return [];
        }

        $ids = get_posts([
            'post_type' => $post_type,
            'post_status' => ['publish', 'draft', 'private', 'pending'],
            'posts_per_page' => -1,
            'fields' => 'ids',
            'no_found_rows' => true,
            'suppress_filters' => false,
        ]);

        return array_values(array_map('absint', is_array($ids) ? $ids : []));
    }

    private static function count_posts_by_type(string $post_type): int {
        $counts = post_type_exists($post_type) ? wp_count_posts($post_type) : null;
        return $counts && isset($counts->publish) ? (int) $counts->publish : 0;
    }

    private static function count_posts_since(array $post_ids, string $since, string $date_field): int {
        $threshold = strtotime($since);
        if (!$threshold) {
            return 0;
        }

        $count = 0;
        foreach ($post_ids as $post_id) {
            $post = get_post($post_id);
            if (!$post) {
                continue;
            }

            $date = $date_field === 'post_modified' ? $post->post_modified : $post->post_date;
            if (strtotime((string) $date) >= $threshold) {
                $count++;
            }
        }

        return $count;
    }

    private static function count_unavailable_vehicles(array $post_ids): int {
        $count = 0;
        foreach ($post_ids as $post_id) {
            $status = strtolower(self::remove_accents_safe((string) get_post_meta($post_id, 'status', true)));
            if ($status !== '' && preg_match('/vend|sold|indispon|baix|exclu/', $status)) {
                $count++;
            }
        }
        return $count;
    }

    private static function numeric_meta_values(array $post_ids, string $key): array {
        $values = [];
        foreach ($post_ids as $post_id) {
            $value = get_post_meta($post_id, $key, true);
            if (is_numeric($value) && (float) $value > 0) {
                $values[] = (float) $value;
            }
        }
        return $values;
    }

    private static function average(array $values): float {
        if (empty($values)) {
            return 0;
        }
        return array_sum($values) / count($values);
    }

    private static function average_post_age(array $post_ids): float {
        if (empty($post_ids)) {
            return 0;
        }

        $now = time();
        $days = [];
        foreach ($post_ids as $post_id) {
            $post = get_post($post_id);
            if (!$post) {
                continue;
            }
            $published = strtotime((string) $post->post_date);
            if ($published) {
                $days[] = max(0, ($now - $published) / self::day_in_seconds());
            }
        }

        return self::average($days);
    }

    private static function oldest_post_label(array $post_ids): string {
        $oldest = null;
        foreach ($post_ids as $post_id) {
            $post = get_post($post_id);
            if (!$post) {
                continue;
            }
            if (!$oldest || strtotime((string) $post->post_date) < strtotime((string) $oldest->post_date)) {
                $oldest = $post;
            }
        }

        return $oldest ? html_entity_decode(get_the_title($oldest), ENT_QUOTES, self::blog_charset()) : '0';
    }

    private static function count_empty_meta(array $post_ids, string $key): int {
        $count = 0;
        foreach ($post_ids as $post_id) {
            $value = trim((string) get_post_meta($post_id, $key, true));
            if ($value === '') {
                $count++;
            }
        }
        return $count;
    }

    private static function count_zero_meta(array $post_ids, string $key): int {
        $count = 0;
        foreach ($post_ids as $post_id) {
            $value = get_post_meta($post_id, $key, true);
            if (!is_numeric($value) || (float) $value <= 0) {
                $count++;
            }
        }
        return $count;
    }

    private static function count_without_terms(array $post_ids, string $taxonomy): int {
        $count = 0;
        foreach ($post_ids as $post_id) {
            $terms = get_the_terms($post_id, $taxonomy);
            if (empty($terms) || is_wp_error($terms)) {
                $count++;
            }
        }
        return $count;
    }

    private static function count_terms_used(array $post_ids, string $taxonomy): int {
        $term_ids = [];
        foreach ($post_ids as $post_id) {
            $terms = get_the_terms($post_id, $taxonomy);
            if (empty($terms) || is_wp_error($terms)) {
                continue;
            }
            foreach ($terms as $term) {
                $term_ids[] = (int) $term->term_id;
            }
        }
        return count(array_unique($term_ids));
    }

    private static function top_taxonomy_label(array $post_ids, string $taxonomy): string {
        $counts = [];
        foreach ($post_ids as $post_id) {
            $terms = get_the_terms($post_id, $taxonomy);
            if (empty($terms) || is_wp_error($terms)) {
                continue;
            }
            foreach ($terms as $term) {
                $name = (string) $term->name;
                $counts[$name] = ($counts[$name] ?? 0) + 1;
            }
        }

        if (empty($counts)) {
            return '0';
        }

        arsort($counts);
        $name = (string) self::first_array_key($counts);
        return $name . ' (' . self::format_int((int) $counts[$name]) . ')';
    }

    private static function complete_vehicle_rate(array $post_ids): float {
        if (empty($post_ids)) {
            return 0;
        }

        $complete = 0;
        foreach ($post_ids as $post_id) {
            $has_photo = trim((string) get_post_meta($post_id, 'galeria_fotos', true)) !== '';
            $has_price = (float) get_post_meta($post_id, 'preco', true) > 0;
            $has_km = (float) get_post_meta($post_id, 'km', true) > 0;
            $has_brand = !self::post_has_no_terms($post_id, 'veiculo_marca');
            $has_model = !self::post_has_no_terms($post_id, 'veiculo_modelo');
            $has_unit = !self::post_has_no_terms($post_id, 'veiculo_unidade');
            if ($has_photo && $has_price && $has_km && $has_brand && $has_model && $has_unit) {
                $complete++;
            }
        }

        return ($complete / count($post_ids)) * 100;
    }

    private static function post_has_no_terms(int $post_id, string $taxonomy): bool {
        $terms = get_the_terms($post_id, $taxonomy);
        return empty($terms) || is_wp_error($terms);
    }

    private static function get_favorites_stats(): array {
        $users = get_users(['fields' => 'ID']);
        $counts = [];
        foreach ($users as $user_id) {
            $favorites = get_user_meta((int) $user_id, '_savol_vehicle_favorites', true);
            if (!is_array($favorites)) {
                continue;
            }
            foreach ($favorites as $vehicle_id) {
                $vehicle_id = absint($vehicle_id);
                if ($vehicle_id > 0) {
                    $counts[$vehicle_id] = ($counts[$vehicle_id] ?? 0) + 1;
                }
            }
        }

        if (empty($counts)) {
            return ['top_vehicle' => '0'];
        }

        arsort($counts);
        $vehicle_id = (int) self::first_array_key($counts);
        return [
            'top_vehicle' => html_entity_decode(get_the_title($vehicle_id), ENT_QUOTES, self::blog_charset()) . ' (' . self::format_int((int) $counts[$vehicle_id]) . ')',
        ];
    }

    private static function top_sell_lead_vehicle(array $lead_ids): string {
        $counts = [];
        foreach ($lead_ids as $post_id) {
            $brand = trim((string) get_post_meta($post_id, 'savol_vsc_vehicle_brand', true));
            $model = trim((string) get_post_meta($post_id, 'savol_vsc_vehicle_model', true));
            $label = trim($brand . ' ' . $model);
            if ($label !== '') {
                $counts[$label] = ($counts[$label] ?? 0) + 1;
            }
        }

        if (empty($counts)) {
            return '0';
        }

        arsort($counts);
        $label = (string) self::first_array_key($counts);
        return $label . ' (' . self::format_int((int) $counts[$label]) . ')';
    }

    private static function top_meta_value(array $post_ids, string $meta_key): string {
        $counts = [];
        foreach ($post_ids as $post_id) {
            $value = trim((string) get_post_meta($post_id, $meta_key, true));
            if ($value !== '') {
                $counts[$value] = ($counts[$value] ?? 0) + 1;
            }
        }

        if (empty($counts)) {
            return '0';
        }

        arsort($counts);
        $value = (string) self::first_array_key($counts);
        return $value . ' (' . self::format_int((int) $counts[$value]) . ')';
    }

    private static function get_user_stats(): array {
        $counts = count_users();
        $total = isset($counts['total_users']) ? (int) $counts['total_users'] : 0;
        $with_favorites = 0;
        $users = get_users(['fields' => 'ID']);
        foreach ($users as $user_id) {
            $favorites = get_user_meta((int) $user_id, '_savol_vehicle_favorites', true);
            if (is_array($favorites) && !empty($favorites)) {
                $with_favorites++;
            }
        }

        return [
            'total' => $total,
            'with_favorites' => $with_favorites,
        ];
    }

    private static function get_autosync_status(): array {
        $progress = get_option('savol_veiculos_autosync_progress', []);
        $last_error = trim((string) get_option('savol_veiculos_autosync_last_error', ''));
        $last_call = (int) get_option('savol_veiculos_autosync_last_api_call', 0);

        if (is_array($progress) && !empty($progress['status'])) {
            $status = (string) $progress['status'];
            $message = !empty($progress['message']) ? (string) $progress['message'] : 'Status registrado';
            return ['status' => ucfirst($status), 'note' => $message];
        }

        if ($last_error !== '') {
            return ['status' => 'Erro', 'note' => $last_error];
        }

        if ($last_call > 0) {
            return ['status' => 'OK', 'note' => 'Ultima chamada em ' . date_i18n('d/m/Y H:i', $last_call)];
        }

        return ['status' => 'N/D', 'note' => 'Sem sincronizacao registrada'];
    }

    private static function format_int(int $value): string {
        return number_format_i18n($value);
    }

    private static function format_decimal(float $value): string {
        return number_format_i18n($value, 1);
    }

    private static function format_money(float $value): string {
        if ($value <= 0) {
            return 'R$ 0';
        }
        return 'R$ ' . number_format_i18n($value, 0);
    }

    private static function format_percent(float $value): string {
        return number_format_i18n($value, 1) . '%';
    }

    private static function format_days(float $value): string {
        return number_format_i18n((int) round($value)) . ' dias';
    }

    private static function day_in_seconds(): int {
        return defined('DAY_IN_SECONDS') ? (int) DAY_IN_SECONDS : 86400;
    }

    private static function blog_charset(): string {
        return function_exists('get_bloginfo') ? (string) get_bloginfo('charset') : 'UTF-8';
    }

    private static function remove_accents_safe(string $value): string {
        return function_exists('remove_accents') ? remove_accents($value) : $value;
    }

    private static function first_array_key(array $values) {
        foreach ($values as $key => $_value) {
            return $key;
        }

        return null;
    }

    public static function enqueue_admin_assets(): void {
        if (!self::should_use_savol_ui()) {
            if (!self::can_access_dashboard()) {
                return;
            }
        }

        wp_register_style('savol-gestor-admin', false, [], self::VERSION);
        wp_enqueue_style('savol-gestor-admin');
        wp_add_inline_style('savol-gestor-admin', self::should_use_savol_ui() ? self::admin_css() : self::dashboard_widget_css());
    }

    private static function admin_css(): string {
        return <<<'CSS'
body.savol-gestor-role {
    --savol-bg: #f4f7fb;
    --savol-panel: #ffffff;
    --savol-line: #dfe7f1;
    --savol-text: #0f172a;
    --savol-muted: #64748b;
    --savol-blue: #2563eb;
    --savol-blue-dark: #1d4ed8;
}
body.savol-gestor-role #wpadminbar {
    display: none;
}
body.savol-gestor-role.admin-bar #wpwrap {
    padding-top: 0;
}
body.savol-gestor-role #wpwrap,
body.savol-gestor-role #wpcontent {
    background: var(--savol-bg);
}
body.savol-gestor-role #wpcontent {
    margin-left: 232px;
    padding-left: 0;
    min-height: 100vh;
}
body.savol-gestor-role #wpadminbar,
body.savol-gestor-role #adminmenuback,
body.savol-gestor-role #adminmenuwrap {
    background: #0f172a;
    width: 232px;
}
body.savol-gestor-role #adminmenuback {
    border-right: 1px solid rgba(255,255,255,.08);
}
body.savol-gestor-role #adminmenu .wp-menu-image:before {
    color: #cbd5e1;
}
body.savol-gestor-role #adminmenu {
    margin: 18px 12px;
    width: 208px;
}
body.savol-gestor-role #adminmenu:before {
    align-items: center;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 8px;
    color: #ffffff;
    content: "Savol";
    display: flex;
    font-size: 18px;
    font-weight: 800;
    height: 52px;
    letter-spacing: 0;
    margin: 0 0 16px;
    padding-left: 18px;
}
body.savol-gestor-role #adminmenu div.wp-menu-image {
    width: 42px;
}
body.savol-gestor-role #adminmenu a {
    color: #dbeafe;
    border-radius: 8px;
    font-weight: 600;
    min-height: 42px;
}
body.savol-gestor-role #adminmenu .wp-has-current-submenu > a,
body.savol-gestor-role #adminmenu .current a,
body.savol-gestor-role #adminmenu a.wp-has-current-submenu {
    background: var(--savol-blue);
    color: #ffffff;
}
body.savol-gestor-role #adminmenu .wp-submenu {
    background: transparent;
    left: 0;
    margin: 4px 0 8px 42px;
    position: relative;
    top: auto;
    width: auto;
}
body.savol-gestor-role #adminmenu .wp-submenu a {
    color: #bfdbfe;
    font-size: 13px;
    padding: 8px 12px;
}
body.savol-gestor-role #adminmenu .wp-submenu-head,
body.savol-gestor-role #collapse-menu,
body.savol-gestor-role #wpfooter,
body.savol-gestor-role .notice,
body.savol-gestor-role .update-nag,
body.savol-gestor-role #screen-meta-links {
    display: none !important;
}
body.savol-gestor-role .wrap,
.savol-gestor-wrap {
    box-sizing: border-box;
    max-width: none;
    width: 100%;
}
body.savol-gestor-role .wrap {
    margin: 0;
    min-height: 100vh;
    padding: 34px 40px 56px;
}
.savol-gestor-wrap {
    min-height: 100vh;
    padding: 34px 40px 56px;
}
.savol-gestor-hero {
    align-items: center;
    background: var(--savol-panel);
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    margin: 0 0 18px;
    padding: 26px;
}
.savol-brand-mark {
    align-items: center;
    background: #111827;
    border-radius: 8px;
    color: #ffffff;
    display: inline-flex;
    font-size: 16px;
    font-weight: 900;
    height: 38px;
    justify-content: center;
    margin-bottom: 14px;
    width: 38px;
}
.savol-kicker {
    color: var(--savol-blue);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .08em;
    margin: 0 0 8px;
    text-transform: uppercase;
}
.savol-gestor-hero h1 {
    color: var(--savol-text);
    font-size: 28px;
    line-height: 1.2;
    margin: 0;
}
.savol-dashboard-version {
    color: var(--savol-muted);
    font-size: 13px;
    font-weight: 800;
    margin: 8px 0 0;
}
.savol-gestor-actions {
    display: flex;
    gap: 10px;
}
.savol-stats-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 18px;
}
.savol-kpi-section {
    margin: 0 0 22px;
}
.savol-kpi-section-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin: 0 0 12px;
}
.savol-kpi-section-head h2 {
    color: var(--savol-text);
    font-size: 18px;
    font-weight: 850;
    margin: 0;
}
.savol-kpi-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(5, minmax(0, 1fr));
}
.savol-kpi-card {
    background: var(--savol-panel);
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, .05);
    box-sizing: border-box;
    min-height: 124px;
    padding: 16px;
}
.savol-kpi-card span {
    color: var(--savol-muted);
    display: block;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.35;
    min-height: 32px;
    text-transform: uppercase;
}
.savol-kpi-card strong {
    color: var(--savol-text);
    display: block;
    font-size: 24px;
    font-weight: 900;
    line-height: 1.15;
    margin: 8px 0 6px;
    overflow-wrap: anywhere;
}
.savol-kpi-card small {
    color: #64748b;
    display: block;
    font-size: 12px;
    line-height: 1.35;
}
.savol-kpi-card.is-missing {
    background: #f8fafc;
    border-style: dashed;
}
.savol-kpi-card.is-missing strong {
    color: #94a3b8;
}
.savol-stat-card,
.savol-panel {
    background: var(--savol-panel);
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, .06);
}
.savol-stat-card {
    display: block;
    padding: 22px;
    text-decoration: none;
}
.savol-stat-card span {
    color: var(--savol-muted);
    display: block;
    font-size: 13px;
    margin-bottom: 10px;
}
.savol-stat-card strong {
    color: var(--savol-text);
    display: block;
    font-size: 34px;
    line-height: 1;
}
.savol-panel {
    padding: 20px;
}
.savol-panel-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
}
.savol-panel-header h2 {
    color: var(--savol-text);
    font-size: 18px;
    margin: 0;
}
.savol-clean-table {
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    overflow: hidden;
}
.savol-empty {
    color: var(--savol-muted);
    margin: 0;
}
body.savol-gestor-role .wrap h1.wp-heading-inline,
body.savol-gestor-role .wrap > h1:first-child {
    align-items: center;
    background: var(--savol-panel);
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, .05);
    box-sizing: border-box;
    color: var(--savol-text);
    display: flex;
    font-size: 26px;
    font-weight: 800;
    justify-content: space-between;
    letter-spacing: 0;
    margin: 0 0 18px;
    min-height: 86px;
    padding: 0 26px;
    width: 100%;
}
body.savol-gestor-role .wrap h1.wp-heading-inline:before,
body.savol-gestor-role .wrap > h1:first-child:before {
    align-items: center;
    background: #0f172a;
    border-radius: 8px;
    color: #ffffff;
    content: "S";
    display: inline-flex;
    font-size: 18px;
    font-weight: 900;
    height: 42px;
    justify-content: center;
    margin-right: 14px;
    width: 42px;
}
body.savol-gestor-role .wrap h1.wp-heading-inline:after,
body.savol-gestor-role .wrap > h1:first-child:after {
    color: var(--savol-muted);
    content: "Gestao Savol";
    font-size: 13px;
    font-weight: 800;
    margin-left: auto;
    text-transform: uppercase;
}
body.savol-gestor-role .subsubsub {
    background: var(--savol-panel);
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, .04);
    display: flex;
    gap: 4px;
    margin: 0 0 16px;
    padding: 8px;
    width: fit-content;
}
body.savol-gestor-role .subsubsub li {
    margin: 0;
}
body.savol-gestor-role .subsubsub .count,
body.savol-gestor-role .subsubsub .trash,
body.savol-gestor-role .subsubsub .separator {
    display: none;
}
body.savol-gestor-role .subsubsub a {
    color: var(--savol-muted);
    border-radius: 7px;
    display: inline-flex;
    font-weight: 700;
    padding: 8px 12px;
    text-decoration: none;
}
body.savol-gestor-role .subsubsub a.current {
    background: #eff6ff;
    color: var(--savol-blue);
}
body.savol-gestor-role .tablenav,
body.savol-gestor-role .search-box,
body.savol-gestor-role .alignleft.actions {
    color: var(--savol-muted);
}
body.savol-gestor-role .search-box {
    display: flex;
    gap: 10px;
    margin: 0 0 16px;
}
body.savol-gestor-role .search-box label {
    display: none;
}
body.savol-gestor-role .tablenav {
    background: transparent;
    clear: both;
    height: auto;
    margin: 0 0 14px;
}
body.savol-gestor-role .tablenav.top {
    align-items: center;
    display: flex;
    justify-content: space-between;
}
body.savol-gestor-role .tablenav.top .actions {
    display: flex;
    gap: 8px;
}
body.savol-gestor-role .tablenav.bottom {
    margin-top: 16px;
}
body.savol-gestor-role .tablenav-pages {
    color: var(--savol-muted);
    font-weight: 700;
}
body.savol-gestor-role input[type="text"],
body.savol-gestor-role input[type="search"],
body.savol-gestor-role input[type="number"],
body.savol-gestor-role input[type="url"],
body.savol-gestor-role input[type="email"],
body.savol-gestor-role textarea,
body.savol-gestor-role select {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    box-shadow: none;
    min-height: 38px;
}
body.savol-gestor-role .button,
body.savol-gestor-role .button-secondary {
    border-radius: 8px;
    border-color: #cbd5e1;
    min-height: 36px;
}
body.savol-gestor-role .button-primary {
    background: var(--savol-blue);
    border-color: var(--savol-blue);
}
body.savol-gestor-role .button-primary:hover,
body.savol-gestor-role .button-primary:focus {
    background: var(--savol-blue-dark);
    border-color: var(--savol-blue-dark);
}
body.savol-gestor-role .wp-list-table {
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    box-sizing: border-box;
    box-shadow: 0 10px 24px rgba(15, 23, 42, .05);
    display: table;
    overflow: hidden;
    table-layout: fixed;
    width: 100%;
}
body.savol-gestor-role .wp-list-table thead th,
body.savol-gestor-role .wp-list-table tfoot th {
    background: #f8fafc;
    color: #475569;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
}
body.savol-gestor-role .wp-list-table td,
body.savol-gestor-role .wp-list-table th {
    border-color: #edf2f7;
    padding: 16px 14px;
    vertical-align: top;
    word-break: normal;
}
body.savol-gestor-role .wp-list-table tbody tr:nth-child(odd) {
    background: #ffffff;
}
body.savol-gestor-role .wp-list-table tbody tr:nth-child(even) {
    background: #f8fafc;
}
body.savol-gestor-role .wp-list-table tbody tr:hover {
    background: #eff6ff;
}
body.savol-gestor-role .wp-list-table a {
    color: #0f5fb8;
    font-weight: 700;
    text-decoration: none;
}
body.savol-gestor-role .wp-list-table .column-title {
    width: 24%;
}
body.savol-gestor-role .wp-list-table .column-date {
    width: 150px;
}
body.savol-gestor-role .wp-list-table .check-column {
    padding-left: 12px;
    width: 42px;
}
body.savol-gestor-role .wp-list-table .column-marca,
body.savol-gestor-role .wp-list-table .column-modelo,
body.savol-gestor-role .wp-list-table .column-versao,
body.savol-gestor-role .wp-list-table .column-cor,
body.savol-gestor-role .wp-list-table .column-cidade,
body.savol-gestor-role .wp-list-table .column-uf,
body.savol-gestor-role .wp-list-table .column-unidade {
    min-width: 120px;
}
body.savol-gestor-role .wp-list-table .row-actions {
    color: transparent;
    margin-top: 8px;
}
body.savol-gestor-role .wp-list-table .row-actions .edit a {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    color: var(--savol-blue);
    display: inline-flex;
    font-size: 12px;
    font-weight: 800;
    padding: 5px 9px;
}
body.savol-gestor-role #poststuff,
body.savol-gestor-role #post-body-content,
body.savol-gestor-role .postbox {
    color: var(--savol-text);
}
body.savol-gestor-role .postbox {
    border: 1px solid var(--savol-line);
    border-radius: 8px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, .05);
}
body.savol-gestor-role .postbox-header {
    border-bottom-color: var(--savol-line);
}
body.savol-gestor-role .page-title-action,
body.savol-gestor-role .bulkactions,
body.savol-gestor-role .row-actions .trash,
body.savol-gestor-role .row-actions .delete,
body.savol-gestor-role .row-actions .view,
body.savol-gestor-role .row-actions .inline,
body.savol-gestor-role .row-actions .inline\ hide-if-no-js,
body.savol-gestor-role .tablenav .one-page .pagination-links {
    display: none !important;
}
@media (max-width: 782px) {
    body.savol-gestor-role #wpcontent {
        margin-left: 0;
    }
    body.savol-gestor-role .wrap,
    .savol-gestor-wrap {
        padding: 20px 16px 34px;
    }
    body.savol-gestor-role .wrap h1.wp-heading-inline,
    body.savol-gestor-role .wrap > h1:first-child {
        align-items: flex-start;
        flex-direction: column;
        gap: 8px;
        height: auto;
        padding: 20px;
    }
    body.savol-gestor-role .wrap h1.wp-heading-inline:after,
    body.savol-gestor-role .wrap > h1:first-child:after {
        margin-left: 0;
    }
    .savol-gestor-hero,
    .savol-gestor-actions {
        align-items: stretch;
        flex-direction: column;
    }
    .savol-stats-grid {
        grid-template-columns: 1fr;
    }
    .savol-kpi-grid {
        grid-template-columns: 1fr;
    }
}
@media (min-width: 783px) and (max-width: 1400px) {
    .savol-kpi-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}
@media (min-width: 783px) and (max-width: 1180px) {
    .savol-kpi-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}
@media (min-width: 783px) and (max-width: 980px) {
    .savol-kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
CSS;
    }

    private static function dashboard_widget_css(): string {
        return <<<'CSS'
#savol_painel_comercial_access_widget .inside {
    margin: 0;
    padding: 0;
}
.savol-access-widget {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    border-radius: 8px;
    color: #ffffff;
    margin: 0;
    padding: 22px;
}
.savol-access-widget .savol-access-eyebrow {
    color: #bfdbfe;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .08em;
    margin: 0 0 8px;
    text-transform: uppercase;
}
.savol-access-widget h2 {
    color: #ffffff;
    font-size: 22px;
    line-height: 1.2;
    margin: 0 0 8px;
}
.savol-access-widget p {
    color: #dbeafe;
    font-size: 13px;
    margin: 0 0 16px;
}
.savol-access-widget .button.button-hero {
    align-items: center;
    background: #ffffff;
    border: 0;
    border-radius: 8px;
    color: #1d4ed8;
    display: inline-flex;
    font-weight: 900;
    min-height: 42px;
    padding: 0 18px;
}
.savol-access-links {
    display: flex;
    gap: 14px;
    margin-top: 16px;
}
.savol-access-links a {
    color: #bfdbfe;
    font-weight: 800;
    text-decoration: none;
}
CSS;
    }

    public static function enqueue_login_assets(): void {
        wp_register_style('savol-gestor-login', false, [], self::VERSION);
        wp_enqueue_style('savol-gestor-login');
        wp_add_inline_style('savol-gestor-login', self::login_css());
    }

    private static function login_css(): string {
        $image = esc_url_raw(self::LOGIN_IMAGE_URL);
        return <<<CSS
body.login {
    align-items: center;
    background: #0f172a url('{$image}') center/cover fixed no-repeat;
    display: flex;
    min-height: 100vh;
}
body.login:before {
    background: linear-gradient(90deg, rgba(15,23,42,.92), rgba(15,23,42,.68), rgba(15,23,42,.35));
    content: "";
    inset: 0;
    position: fixed;
}
body.login #login {
    background: rgba(255,255,255,.96);
    border: 1px solid rgba(255,255,255,.75);
    border-radius: 8px;
    box-shadow: 0 28px 80px rgba(0,0,0,.28);
    margin: 0 0 0 8vw;
    padding: 34px;
    position: relative;
    width: 390px;
}
body.login h1 a {
    background: none;
    color: #0f172a;
    display: block;
    font-size: 0;
    height: auto;
    margin: 0 0 22px;
    text-indent: 0;
    width: auto;
}
body.login h1 a:before {
    align-items: center;
    background: #0f172a;
    border-radius: 8px;
    color: #ffffff;
    content: "Savol";
    display: inline-flex;
    font-size: 24px;
    font-weight: 900;
    height: 54px;
    justify-content: center;
    letter-spacing: 0;
    width: 126px;
}
body.login h1:after {
    color: #64748b;
    content: "Gestao de seminovos";
    display: block;
    font-size: 14px;
    font-weight: 700;
    margin: -8px 0 20px;
}
body.login form {
    background: transparent;
    border: 0;
    box-shadow: none;
    margin: 0;
    padding: 0;
}
body.login label {
    color: #334155;
    font-size: 13px;
    font-weight: 700;
}
body.login input[type="text"],
body.login input[type="password"] {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    box-shadow: none;
    color: #0f172a;
    font-size: 16px;
    min-height: 46px;
}
body.login .button-primary {
    background: #2563eb;
    border: 0;
    border-radius: 8px;
    box-shadow: none;
    font-weight: 800;
    min-height: 44px;
    padding: 0 18px;
    text-shadow: none;
}
body.login .button-primary:hover,
body.login .button-primary:focus {
    background: #1d4ed8;
}
body.login #nav,
body.login #backtoblog,
body.login .privacy-policy-page-link {
    margin-left: 0;
    padding-left: 0;
}
body.login #nav a,
body.login #backtoblog a,
body.login .privacy-policy-page-link a {
    color: #475569;
    font-weight: 700;
}
body.login .message,
body.login .notice,
body.login #login_error {
    border-left: 0;
    border-radius: 8px;
    box-shadow: none;
}
@media (max-width: 782px) {
    body.login {
        justify-content: center;
        padding: 18px;
    }
    body.login #login {
        margin: 0;
        max-width: calc(100vw - 36px);
        width: 100%;
    }
}
CSS;
    }

    public static function login_header_url(): string {
        return home_url('/');
    }

    public static function login_header_text(): string {
        return 'Savol Seminovos';
    }

    public static function admin_body_class($classes) {
        if (self::should_use_savol_ui()) {
            $classes .= ' savol-gestor-role';
        }
        return $classes;
    }

    public static function admin_footer_text($text = '') {
        return self::is_restricted_gestor() ? '' : $text;
    }

    public static function hide_screen_options($show) {
        return self::is_restricted_gestor() ? false : $show;
    }

    public static function remove_help_tabs(): void {
        if (!self::is_restricted_gestor()) {
            return;
        }

        $screen = get_current_screen();
        if ($screen) {
            $screen->remove_help_tabs();
        }
    }

    public static function filter_row_actions($actions, $post) {
        if (!self::is_restricted_gestor()) {
            return $actions;
        }

        if (!is_array($actions)) {
            return $actions;
        }

        unset($actions['trash'], $actions['delete'], $actions['view'], $actions['inline hide-if-no-js']);
        return $actions;
    }

    public static function filter_bulk_actions($actions) {
        if (!self::is_restricted_gestor()) {
            return $actions;
        }

        if (!is_array($actions)) {
            return $actions;
        }

        unset($actions['trash'], $actions['delete']);
        return $actions;
    }

    public static function trim_admin_bar(): void {
        if (!self::is_restricted_gestor()) {
            return;
        }

        global $wp_admin_bar;
        $wp_admin_bar->remove_node('wp-logo');
        $wp_admin_bar->remove_node('comments');
        $wp_admin_bar->remove_node('new-content');
        $wp_admin_bar->remove_node('customize');
    }

    private static function is_gestor(): bool {
        $user = wp_get_current_user();
        return $user && in_array(self::ROLE, (array) $user->roles, true);
    }

    private static function has_savol_access(): bool {
        return current_user_can(self::DASHBOARD_CAPABILITY)
            || current_user_can('edit_veiculos')
            || current_user_can('edit_venda_carro_leads')
            || self::is_gestor();
    }

    private static function is_restricted_gestor(): bool {
        return self::has_savol_access() && !current_user_can('manage_options');
    }

    private static function can_access_dashboard(): bool {
        return current_user_can('manage_options') || self::has_savol_access();
    }

    private static function should_use_savol_ui(): bool {
        if (self::is_restricted_gestor()) {
            return true;
        }

        return current_user_can('manage_options') && self::request_value('page') === self::DASHBOARD_SLUG;
    }
}

Savol_Painel_Comercial::init();
register_activation_hook(__FILE__, ['Savol_Painel_Comercial', 'activate']);
register_deactivation_hook(__FILE__, ['Savol_Painel_Comercial', 'deactivate']);

endif;
