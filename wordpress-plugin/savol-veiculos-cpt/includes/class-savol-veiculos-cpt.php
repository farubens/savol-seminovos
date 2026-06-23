<?php
if (!defined('ABSPATH')) {
    exit;
}

final class Savol_Veiculos_CPT {
    private const POST_TYPE = 'veiculo';
    private const SELL_YOUR_CAR_POST_TYPE = 'venda_carro_lead';
    private const NONCE_ACTION = 'savol_veiculos_save_meta';
    private const NONCE_NAME = 'savol_veiculos_nonce';
    private const AUTOSYNC_OPTION = 'savol_veiculos_autosync_token';
    private const AUTOSYNC_LAST_ERROR_OPTION = 'savol_veiculos_autosync_last_error';
    private const AUTOSYNC_PROGRESS_OPTION = 'savol_veiculos_autosync_progress';
    private const AUTOSYNC_ENDPOINT_OPTION = 'savol_veiculos_autosync_endpoint';
    private const AUTOSYNC_ENDPOINT_DEFAULT = 'https://sync-backend.autoavaliar.com.br/vehicle/stock';
    private const AUTOSYNC_BATCH_OPTION = 'savol_veiculos_autosync_batch';
    private const AUTOSYNC_BATCH_SIZE = 1;
    private const AUTOSYNC_BATCH_TIME_LIMIT = 45;
    private const PHOTO_IMPORT_TIMEOUT = 5;
    private const SELL_YOUR_CAR_MAX_PHOTO_SIZE = 8388608;
    private const SELL_YOUR_CAR_REST_NAMESPACE = 'savol/v1';
    private const SELL_YOUR_CAR_REST_ROUTE = '/venda-seu-carro';
    // Legacy list kept for backward reference. The active site flow uses sell_your_car_photo_fields().
    private const SELL_YOUR_CAR_PHOTO_FIELDS = [
        'photo_front' => 'Frente',
        'photo_leftSide' => 'Lateral esquerda',
        'photo_rightSide' => 'Lateral direita',
        'photo_rear' => 'Traseira',
        'photo_dashboard' => 'Painel',
        'photo_odometer' => 'Odômetro',
        'photo_spare' => 'Estepe',
        'photo_trunk' => 'Porta-malas',
        'photo_roof' => 'Teto',
        'photo_tire' => 'Pneu',
        'photo_engine' => 'Motor',
        'photo_chassis' => 'Chassi',
    ];
    private const UNIDADE_CONTACTS = [
        'unidade savol toyota santo andre' => [
            'telefone' => '(11) 4979-6000',
            'whatsapp' => '(11) 4979-6000',
            'endereco' => 'Av. Artur de Queiros, 469 - Casa Branca, Santo Andre - SP, 09015-510',
        ],
        'unidade savol toyota sao bernardo do campo' => [
            'telefone' => '(11) 3809-1000',
            'whatsapp' => '(11) 4979-6000',
            'endereco' => 'Av. Senador Vergueiro, 2332 - Anchieta, Sao Bernardo do Campo - SP, 09600-004',
        ],
        'unidade savol toyota maua' => [
            'telefone' => '',
            'whatsapp' => '(11) 4979-6000',
            'endereco' => 'Av. Joao Ramalho, 1853 - Vila Noemia, Maua - SP, 09371-520',
        ],
        'unidade savol toyota praia grande' => [
            'telefone' => '(13) 3476-7000',
            'whatsapp' => '(11) 4979-6000',
            'endereco' => 'Av. Guilhermina, 1021 - Guilhermina, Praia Grande - SP, 11701-500',
        ],
        'unidade savol toyota dom pedro ii' => [
            'telefone' => '(11) 4979-6000',
            'whatsapp' => '(11) 4979-6000',
            'endereco' => 'Av. Dom Pedro II, 2500 - Santo Andre - SP, 09080110',
        ],
        'unidade savol volkswagen santo andre' => [
            'telefone' => '(11) 4435-1000',
            'whatsapp' => '(11) 4435-1000',
            'endereco' => 'Av. Artur de Queiros, 701 - Casa Branca, Santo Andre - SP, 09015-510',
        ],
        'unidade savol volkswagen pereira barreto' => [
            'telefone' => '(11) 4435-1000',
            'whatsapp' => '(11) 4435-1000',
            'endereco' => 'Av. Pereira Barreto, 888 - Paraiso - Santo Andre - SP',
        ],
        'unidade savol peugeot santo andre' => [
            'telefone' => '(11) 3381-1000',
            'whatsapp' => '(11) 3381-1005',
            'endereco' => 'Av. Artur de Queiros, 426 - Casa Branca, Santo Andre - SP, 09015-510',
        ],
        'unidade savol peugeot sao bernardo do campo' => [
            'telefone' => '(11) 3381-1000',
            'whatsapp' => '(11) 3381-1005',
            'endereco' => 'Av. Senador Vergueiro, 2302 - Anchieta, Sao Bernardo do Campo - SP, 09600-004',
        ],
        'unidade savol peugeot sao caetano do sul' => [
            'telefone' => '(11) 3381-1000',
            'whatsapp' => '(11) 3381-1005',
            'endereco' => 'Av. Goias, 2155 - Santo Antonio, Sao Caetano do Sul - SP, 09521-300',
        ],
        'unidade savol citroen santo andre' => [
            'telefone' => '(11) 3381-1001',
            'whatsapp' => '(11) 3381-1005',
            'endereco' => 'Av. Artur de Queiros, 424 - Casa Branca, Santo Andre - SP, 09015-510',
        ],
        'unidade savol citroen sao bernardo do campo' => [
            'telefone' => '(11) 3381-1001',
            'whatsapp' => '(11) 3381-1005',
            'endereco' => 'Av. Senador Vergueiro, 2302 - Rudge Ramos, Sao Bernardo do Campo - SP, 09600-004',
        ],
        'unidade savol citroen sao caetano do sul' => [
            'telefone' => '(11) 3381-1001',
            'whatsapp' => '(11) 3381-1005',
            'endereco' => 'Av. Goias, 2155 - Santo Antonio, Sao Caetano do Sul - SP, 09521-300',
        ],
        'unidade savol fiat santo andre' => [
            'telefone' => '(11) 3319-1000',
            'whatsapp' => '(11) 3319-1000',
            'endereco' => 'Av. Artur de Queiros, 414 - Casa Branca, Santo Andre - SP, 09015-510',
        ],
        'unidade savol fiat sao caetano do sul' => [
            'telefone' => '(11) 3319-1000',
            'whatsapp' => '(11) 3319-1000',
            'endereco' => 'Av. Goias, 2145 - Barcelona, Sao Caetano do Sul - SP, 09550-001',
        ],
        'unidade savol fiat sao bernardo do campo' => [
            'telefone' => '(11) 3319-1000',
            'whatsapp' => '(11) 3319-1000',
            'endereco' => 'Av. Senador Vergueiro, 2348 - Anchieta, Sao Bernardo do Campo - SP, 09600-004',
        ],
        'unidade savol kia santo andre' => [
            'telefone' => '(11) 3381-1010',
            'whatsapp' => '(11) 4331-1000',
            'endereco' => 'Av. Artur de Queiros, 727 - Casa Branca, Santo Andre - SP, 09015-510',
        ],
        'unidade savol kia sao paulo' => [
            'telefone' => '(11) 3381-1010',
            'whatsapp' => '(11) 4331-1000',
            'endereco' => 'Av. Nazare, 444 - Ipiranga, Sao Paulo - SP, 04262-000',
        ],
        'unidade savol mg motor' => [
            'telefone' => '(11) 3809-1010',
            'whatsapp' => '',
            'endereco' => 'Av. Goias, 3048 - Santo Antonio, Sao Caetano do Sul - SP, 09521-310',
        ],
        'unidade savol jetour' => [
            'telefone' => '(11) 3319-1010',
            'whatsapp' => '',
            'endereco' => 'Av. D. Pedro II, 2550 - Bairro Campestre - Santo Andre - SP',
        ],
        'unidade savol jetour sao caetano do sul' => [
            'telefone' => '(11) 3319-1010',
            'whatsapp' => '',
            'endereco' => 'Alameda Terracota, 545 - Piso 1 (Terreo) - Ceramica, Sao Caetano do Sul - SP, 09531-190',
        ],
    ];

    /**
     * Campos de metadados do veiculo.
     * type: text|number|boolean
     */
    private static function fields(): array {
        return [
            'condicao' => ['label' => 'Condicao', 'type' => 'text'],
            'placa' => ['label' => 'Placa', 'type' => 'text'],
            'renavam' => ['label' => 'Renavam', 'type' => 'text'],
            'chassi_vin' => ['label' => 'Chassi (VIN)', 'type' => 'text'],
            'ano' => ['label' => 'Ano', 'type' => 'number'],
            'ano_modelo' => ['label' => 'Ano modelo', 'type' => 'number'],
            'km' => ['label' => 'KM', 'type' => 'number'],
            'preco' => ['label' => 'Preco', 'type' => 'number'],
            'status' => ['label' => 'Status', 'type' => 'text'],
            'combustivel' => ['label' => 'Combustivel', 'type' => 'text'],
            'cambio' => ['label' => 'Cambio', 'type' => 'text'],
            'categoria' => ['label' => 'Categoria', 'type' => 'text'],
            'carroceria' => ['label' => 'Carroceria', 'type' => 'text'],
            'portas' => ['label' => 'Portas', 'type' => 'number'],
            'lugares' => ['label' => 'Lugares', 'type' => 'number'],
            'tracao' => ['label' => 'Tracao', 'type' => 'text'],
            'motor' => ['label' => 'Motor', 'type' => 'text'],
            'potencia_cv' => ['label' => 'Potencia (cv)', 'type' => 'number'],
            'torque_nm' => ['label' => 'Torque (Nm)', 'type' => 'number'],
            'qtd_donos' => ['label' => 'Qtd. de donos', 'type' => 'number'],
            'identificador_externo' => ['label' => 'Identificador externo', 'type' => 'text'],
            'galeria_fotos' => ['label' => 'Galeria de fotos', 'type' => 'gallery'],
            'ipva_pago' => ['label' => 'IPVA pago', 'type' => 'boolean'],
            'licenciado' => ['label' => 'Licenciado', 'type' => 'boolean'],
            'blindado' => ['label' => 'Blindado', 'type' => 'boolean'],
        ];
    }

    /**
     * Taxonomias associadas ao veiculo.
     */
    private static function taxonomies(): array {
        return [
            'veiculo_marca' => ['label' => 'Marca', 'hierarchical' => true],
            'veiculo_modelo' => ['label' => 'Modelo', 'hierarchical' => true],
            'veiculo_versao' => ['label' => 'Versao', 'hierarchical' => false],
            'veiculo_cor' => ['label' => 'Cor', 'hierarchical' => false],
            'veiculo_cidade' => ['label' => 'Cidade', 'hierarchical' => false],
            'veiculo_uf' => ['label' => 'UF', 'hierarchical' => false],
            'veiculo_unidade' => ['label' => 'Unidade', 'hierarchical' => false],
            'veiculo_informacao_destaque' => ['label' => 'Informação de destaque', 'hierarchical' => false],
            'veiculo_destaque_secundario' => ['label' => 'Destaque secundario', 'hierarchical' => false],
        ];
    }

    public static function init(): void {
        add_action('init', [__CLASS__, 'register_post_type']);
        add_action('init', [__CLASS__, 'register_taxonomies']);
        add_action('init', [__CLASS__, 'register_meta']);
        add_action('init', [__CLASS__, 'register_sell_your_car_api_alias']);
        add_action('rest_api_init', [__CLASS__, 'register_rest_routes']);
        add_filter('query_vars', [__CLASS__, 'register_sell_your_car_query_vars']);
        add_action('parse_request', [__CLASS__, 'handle_sell_your_car_api_alias_request']);
        add_action('template_redirect', [__CLASS__, 'handle_sell_your_car_api_alias']);
        add_action('add_meta_boxes', [__CLASS__, 'add_meta_boxes']);
        add_action('save_post_' . self::POST_TYPE, [__CLASS__, 'save_meta']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue_admin_assets']);
        add_action('admin_menu', [__CLASS__, 'register_admin_menu']);
        add_action('admin_post_savol_veiculos_save_autosync', [__CLASS__, 'handle_save_autosync']);
        add_action('admin_post_savol_veiculos_run_autosync', [__CLASS__, 'handle_run_autosync']);
        add_action('admin_post_savol_veiculos_refresh_unidades', [__CLASS__, 'handle_refresh_unidades']);
        add_action('admin_post_savol_veiculos_import_json', [__CLASS__, 'handle_import_json']);
        add_action('wp_ajax_savol_veiculos_run_autosync', [__CLASS__, 'handle_run_autosync_ajax']);
        add_action('wp_ajax_savol_veiculos_autosync_progress', [__CLASS__, 'handle_autosync_progress_ajax']);
        add_action('savol_veiculos_run_autosync_cron', [__CLASS__, 'run_autosync_cron_job']);
        add_filter('manage_' . self::SELL_YOUR_CAR_POST_TYPE . '_posts_columns', [__CLASS__, 'register_sell_your_car_columns']);
        add_action('manage_' . self::SELL_YOUR_CAR_POST_TYPE . '_posts_custom_column', [__CLASS__, 'render_sell_your_car_column'], 10, 2);
        add_action('veiculo_cor_add_form_fields', [__CLASS__, 'render_cor_add_fields']);
        add_action('veiculo_cor_edit_form_fields', [__CLASS__, 'render_cor_edit_fields']);
        add_action('created_veiculo_cor', [__CLASS__, 'save_cor_term_meta']);
        add_action('edited_veiculo_cor', [__CLASS__, 'save_cor_term_meta']);
        add_action('veiculo_marca_add_form_fields', [__CLASS__, 'render_marca_add_fields']);
        add_action('veiculo_marca_edit_form_fields', [__CLASS__, 'render_marca_edit_fields']);
        add_action('created_veiculo_marca', [__CLASS__, 'save_marca_term_meta']);
        add_action('edited_veiculo_marca', [__CLASS__, 'save_marca_term_meta']);
        add_action('veiculo_unidade_add_form_fields', [__CLASS__, 'render_unidade_add_fields']);
        add_action('veiculo_unidade_edit_form_fields', [__CLASS__, 'render_unidade_edit_fields']);
        add_action('created_veiculo_unidade', [__CLASS__, 'save_unidade_term_meta']);
        add_action('edited_veiculo_unidade', [__CLASS__, 'save_unidade_term_meta']);
    }

    public static function activate(): void {
        self::register_post_type();
        self::register_taxonomies();
        self::register_sell_your_car_api_alias();
        flush_rewrite_rules();
    }

    public static function deactivate(): void {
        flush_rewrite_rules();
    }

    public static function register_post_type(): void {
        $labels = [
            'name' => 'Veiculos',
            'singular_name' => 'Veiculo',
            'menu_name' => 'Veiculos',
            'add_new' => 'Adicionar novo',
            'add_new_item' => 'Adicionar novo veiculo',
            'edit_item' => 'Editar veiculo',
            'new_item' => 'Novo veiculo',
            'view_item' => 'Ver veiculo',
            'search_items' => 'Buscar veiculos',
            'not_found' => 'Nenhum veiculo encontrado',
            'not_found_in_trash' => 'Nenhum veiculo na lixeira',
        ];

        register_post_type(self::POST_TYPE, [
            'labels' => $labels,
            'public' => true,
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-car',
            // Necessario para garantir exposicao dos post meta no WP REST API.
            'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
            'has_archive' => true,
            'rewrite' => ['slug' => 'veiculos'],
        ]);

        register_post_type(self::SELL_YOUR_CAR_POST_TYPE, [
            'labels' => [
                'name' => 'Venda Seu Carro',
                'singular_name' => 'Lead Venda Seu Carro',
                'menu_name' => 'Venda Seu Carro',
                'add_new' => 'Adicionar novo',
                'add_new_item' => 'Adicionar novo lead',
                'edit_item' => 'Ver lead',
                'new_item' => 'Novo lead',
                'view_item' => 'Ver lead',
                'search_items' => 'Buscar leads',
                'not_found' => 'Nenhum lead encontrado',
                'not_found_in_trash' => 'Nenhum lead na lixeira',
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_icon' => 'dashicons-clipboard',
            'menu_position' => 27,
            'show_in_rest' => false,
            'supports' => ['title', 'editor', 'custom-fields'],
            'capability_type' => self::SELL_YOUR_CAR_POST_TYPE,
            'capabilities' => [
                'edit_post' => 'manage_options',
                'read_post' => 'manage_options',
                'delete_post' => 'manage_options',
                'edit_posts' => 'manage_options',
                'edit_others_posts' => 'manage_options',
                'publish_posts' => 'manage_options',
                'read_private_posts' => 'manage_options',
                'delete_posts' => 'manage_options',
                'delete_private_posts' => 'manage_options',
                'delete_published_posts' => 'manage_options',
                'delete_others_posts' => 'manage_options',
                'edit_private_posts' => 'manage_options',
                'edit_published_posts' => 'manage_options',
                'create_posts' => 'do_not_allow',
            ],
            'map_meta_cap' => false,
        ]);
    }

    public static function register_taxonomies(): void {
        foreach (self::taxonomies() as $slug => $config) {
            register_taxonomy($slug, [self::POST_TYPE], [
                'labels' => [
                    'name' => $config['label'],
                    'singular_name' => $config['label'],
                ],
                'public' => true,
                'show_admin_column' => true,
                'show_in_rest' => true,
                'hierarchical' => $config['hierarchical'],
                'rewrite' => ['slug' => $slug],
            ]);
        }
    }

    public static function register_meta(): void {
        foreach (self::fields() as $key => $field) {
            register_post_meta(self::POST_TYPE, $key, [
                'single' => true,
                'show_in_rest' => true,
                'type' => $field['type'] === 'boolean' ? 'boolean' : ($field['type'] === 'number' ? 'number' : 'string'),
                // Leitura liberada para consumo headless/publico sem 401/403 em GET.
                'auth_callback' => '__return_true',
                'sanitize_callback' => static function($value) use ($field) {
                    if ($field['type'] === 'boolean') {
                        return (bool) $value;
                    }
                    if ($field['type'] === 'number') {
                        return is_numeric($value) ? (float) $value : 0;
                    }
                    if ($field['type'] === 'gallery') {
                        return sanitize_text_field((string) $value);
                    }
                    return sanitize_text_field((string) $value);
                },
            ]);
        }
    }

    public static function add_meta_boxes(): void {
        add_meta_box(
            'savol_veiculos_dados',
            'Dados do veiculo',
            [__CLASS__, 'render_meta_box'],
            self::POST_TYPE,
            'normal',
            'high'
        );

        add_meta_box(
            'savol_venda_carro_dados',
            'Dados do lead',
            [__CLASS__, 'render_sell_your_car_meta_box'],
            self::SELL_YOUR_CAR_POST_TYPE,
            'normal',
            'high'
        );
    }

    public static function render_meta_box(\WP_Post $post): void {
        wp_nonce_field(self::NONCE_ACTION, self::NONCE_NAME);

        echo '<div class="savol-veiculos-grid">';

        foreach (self::fields() as $key => $field) {
            $value = get_post_meta($post->ID, $key, true);
            echo '<div class="savol-field">';
            echo '<label for="' . esc_attr($key) . '">' . esc_html($field['label']) . '</label>';

            if ($field['type'] === 'boolean') {
                $checked = !empty($value) ? ' checked' : '';
                echo '<label class="savol-switch">';
                echo '<input type="checkbox" id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="1"' . $checked . ' />';
                echo '<span class="savol-slider" aria-hidden="true"></span>';
                echo '</label>';
            } elseif ($field['type'] === 'gallery') {
                $ids = array_filter(array_map('absint', explode(',', (string) $value)));
                echo '<input type="hidden" id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="' . esc_attr((string) $value) . '" class="savol-gallery-ids" />';
                echo '<p><button type="button" class="button savol-gallery-open">Selecionar fotos</button> <button type="button" class="button savol-gallery-clear">Limpar</button></p>';
                echo '<div class="savol-gallery-preview">';
                foreach ($ids as $id) {
                    $thumb = wp_get_attachment_image_url($id, 'thumbnail');
                    if ($thumb) {
                        echo '<img src="' . esc_url($thumb) . '" alt="" />';
                    }
                }
                echo '</div>';
            } else {
                $input_type = $field['type'] === 'number' ? 'number' : 'text';
                $step = $field['type'] === 'number' ? ' step="any"' : '';
                echo '<input type="' . esc_attr($input_type) . '" id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="' . esc_attr((string) $value) . '"' . $step . ' />';
            }

            echo '</div>';
        }

        echo '</div>';
    }

    public static function render_sell_your_car_meta_box(\WP_Post $post): void {
        $protocol = (string) get_post_meta($post->ID, 'savol_vsc_protocol', true);
        $received_at = (string) get_post_meta($post->ID, 'savol_vsc_received_at', true);
        $photo_error = (string) get_post_meta($post->ID, 'savol_vsc_photo_error', true);
        $photo_ids = array_filter(array_map('absint', explode(',', (string) get_post_meta($post->ID, 'savol_vsc_photo_ids', true))));

        $sections = [
            'Veículo' => [
                'Marca' => 'savol_vsc_vehicle_brand',
                'Modelo' => 'savol_vsc_vehicle_model',
                'Placa' => 'savol_vsc_vehicle_plate',
                'Versão' => 'savol_vsc_vehicle_version',
                'Ano' => 'savol_vsc_vehicle_year',
                'Ano modelo' => 'savol_vsc_vehicle_model_year',
                'Ano fabricacao' => 'savol_vsc_vehicle_manufacture_year',
                'Combustível' => 'savol_vsc_vehicle_fuel',
                'Câmbio' => 'savol_vsc_vehicle_transmission',
                'KM' => 'savol_vsc_vehicle_km',
                'Cor' => 'savol_vsc_vehicle_color',
                'Final da placa' => 'savol_vsc_vehicle_plate_ending',
                'Carroceria' => 'savol_vsc_vehicle_body_type',
                'Preço desejado' => 'savol_vsc_vehicle_desired_price',
                'Observações' => 'savol_vsc_vehicle_notes',
            ],
            'Vendedor' => [
                'Nome' => 'savol_vsc_seller_full_name',
                'E-mail' => 'savol_vsc_seller_email',
                'Telefone' => 'savol_vsc_seller_phone',
                'CPF' => 'savol_vsc_seller_cpf',
                'WhatsApp' => 'savol_vsc_seller_whatsapp',
                'Cidade' => 'savol_vsc_seller_city',
                'Estado' => 'savol_vsc_seller_state',
                'Período de contato' => 'savol_vsc_seller_contact_period',
                'Canal de contato' => 'savol_vsc_seller_contact_channel',
            ],
        ];

        echo '<p><strong>Protocolo:</strong> ' . esc_html($protocol) . '</p>';
        echo '<p><strong>Recebido em:</strong> ' . esc_html($received_at) . '</p>';
        if ($photo_error !== '') {
            echo '<div class="notice notice-warning inline"><p><strong>Erro ao salvar fotos:</strong> ' . esc_html($photo_error) . '</p></div>';
        }

        foreach ($sections as $title => $fields) {
            echo '<h3>' . esc_html($title) . '</h3>';
            echo '<table class="widefat striped"><tbody>';
            foreach ($fields as $label => $meta_key) {
                $value = (string) get_post_meta($post->ID, $meta_key, true);
                echo '<tr><th style="width:180px;">' . esc_html($label) . '</th><td>' . esc_html($value) . '</td></tr>';
            }
            echo '</tbody></table>';
        }

        if (!empty($photo_ids)) {
            echo '<h3>Fotos</h3>';
            echo '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;">';
            foreach ($photo_ids as $photo_id) {
                $thumb = wp_get_attachment_image_url($photo_id, 'thumbnail');
                $label = (string) get_post_meta($photo_id, 'savol_vsc_photo_label', true);
                if ($thumb === false) {
                    continue;
                }
                echo '<div><img src="' . esc_url($thumb) . '" alt="" style="width:100%;height:auto;border:1px solid #ccd0d4;" /><p style="margin:4px 0 0;">' . esc_html($label) . '</p></div>';
            }
            echo '</div>';
        }
    }

    public static function register_sell_your_car_columns(array $columns): array {
        return [
            'cb' => $columns['cb'] ?? '',
            'title' => 'Lead',
            'savol_vsc_protocol' => 'Protocolo',
            'savol_vsc_seller' => 'Vendedor',
            'savol_vsc_vehicle' => 'Veículo',
            'savol_vsc_received_at' => 'Recebido em',
            'date' => $columns['date'] ?? 'Data',
        ];
    }

    public static function render_sell_your_car_column(string $column, int $post_id): void {
        if ($column === 'savol_vsc_protocol') {
            echo esc_html((string) get_post_meta($post_id, 'savol_vsc_protocol', true));
            return;
        }

        if ($column === 'savol_vsc_seller') {
            $name = (string) get_post_meta($post_id, 'savol_vsc_seller_full_name', true);
            $phone = (string) get_post_meta($post_id, 'savol_vsc_seller_phone', true);
            echo esc_html(trim($name . ' ' . $phone));
            return;
        }

        if ($column === 'savol_vsc_vehicle') {
            $brand = (string) get_post_meta($post_id, 'savol_vsc_vehicle_brand', true);
            $model = (string) get_post_meta($post_id, 'savol_vsc_vehicle_model', true);
            $year = (string) get_post_meta($post_id, 'savol_vsc_vehicle_model_year', true);
            if ($year === '') {
                $year = (string) get_post_meta($post_id, 'savol_vsc_vehicle_year', true);
            }
            echo esc_html(trim($brand . ' ' . $model . ' ' . $year));
            return;
        }

        if ($column === 'savol_vsc_received_at') {
            echo esc_html((string) get_post_meta($post_id, 'savol_vsc_received_at', true));
        }
    }

    public static function save_meta(int $post_id): void {
        if (!isset($_POST[self::NONCE_NAME]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST[self::NONCE_NAME])), self::NONCE_ACTION)) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        foreach (self::fields() as $key => $field) {
            if ($field['type'] === 'boolean') {
                update_post_meta($post_id, $key, isset($_POST[$key]) ? 1 : 0);
                continue;
            }

            if (!isset($_POST[$key])) {
                continue;
            }

            $raw = wp_unslash($_POST[$key]);

            if ($field['type'] === 'number') {
                $sanitized = is_numeric($raw) ? (float) $raw : 0;
                update_post_meta($post_id, $key, $sanitized);
                continue;
            }
            if ($field['type'] === 'gallery') {
                $pieces = array_filter(array_map('absint', explode(',', (string) $raw)));
                update_post_meta($post_id, $key, implode(',', $pieces));
                continue;
            }

            update_post_meta($post_id, $key, sanitize_text_field((string) $raw));
        }
    }

    public static function register_sell_your_car_api_alias(): void {
        add_rewrite_rule('^api/venda-seu-carro/?$', 'index.php?savol_venda_seu_carro_api=1', 'top');
    }

    public static function register_sell_your_car_query_vars(array $vars): array {
        $vars[] = 'savol_venda_seu_carro_api';
        return $vars;
    }

    public static function handle_sell_your_car_api_alias_request(\WP $wp): void {
        $request_path = trim((string) ($wp->request ?? ''), '/');
        if ($request_path !== 'api/venda-seu-carro') {
            return;
        }

        self::send_sell_your_car_api_alias_response();
    }

    public static function handle_sell_your_car_api_alias(): void {
        if ((string) get_query_var('savol_venda_seu_carro_api') !== '1') {
            return;
        }

        self::send_sell_your_car_api_alias_response();
    }

    private static function send_sell_your_car_api_alias_response(): void {
        if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
            wp_send_json([
                'ok' => false,
                'error' => 'Metodo nao permitido.',
            ], 405);
        }

        $request = new \WP_REST_Request('POST', '/' . self::SELL_YOUR_CAR_REST_NAMESPACE . self::SELL_YOUR_CAR_REST_ROUTE);
        if (isset($_POST['payload'])) {
            $request->set_param('payload', wp_unslash($_POST['payload']));
        }

        $response = self::handle_sell_your_car_request($request);
        wp_send_json($response->get_data(), $response->get_status());
    }

    public static function register_rest_routes(): void {
        register_rest_route(self::SELL_YOUR_CAR_REST_NAMESPACE, self::SELL_YOUR_CAR_REST_ROUTE, [
            'methods' => \WP_REST_Server::CREATABLE,
            'callback' => [__CLASS__, 'handle_sell_your_car_request'],
            'permission_callback' => '__return_true',
        ]);
    }

    public static function handle_sell_your_car_request(\WP_REST_Request $request): \WP_REST_Response {
        $payload_raw = self::get_sell_your_car_payload_raw($request);
        if (trim($payload_raw) === '') {
            return self::sell_your_car_error('Campo payload ausente.', 400);
        }

        $payload = self::decode_sell_your_car_payload($payload_raw);
        if (!is_array($payload)) {
            return self::sell_your_car_error('Payload JSON invalido: ' . json_last_error_msg() . '.', 400);
        }

        $files = self::get_sell_your_car_files($request);
        $photo_validation_error = self::validate_sell_your_car_photos($files);
        if ($photo_validation_error !== '') {
            return self::sell_your_car_error($photo_validation_error, 400);
        }

        $protocol = self::generate_sell_your_car_protocol();
        $received_at = gmdate('Y-m-d\TH:i:s.000\Z');
        $vehicle = isset($payload['vehicle']) && is_array($payload['vehicle']) ? $payload['vehicle'] : [];
        $seller = isset($payload['seller']) && is_array($payload['seller']) ? $payload['seller'] : [];
        $title = self::build_sell_your_car_title($protocol, $vehicle, $seller);

        $post_id = wp_insert_post([
            'post_type' => self::SELL_YOUR_CAR_POST_TYPE,
            'post_title' => $title,
            'post_status' => 'publish',
            'post_content' => self::build_sell_your_car_content($payload),
        ], true);

        if (is_wp_error($post_id) || (int) $post_id <= 0) {
            return self::sell_your_car_error('Nao foi possivel salvar o lead no WordPress.', 500);
        }

        $post_id = (int) $post_id;
        $attachment_ids = self::store_sell_your_car_photos($post_id, $files);
        if (is_wp_error($attachment_ids)) {
            update_post_meta($post_id, 'savol_vsc_photo_error', $attachment_ids->get_error_message());
            $attachment_ids = [];
        }

        update_post_meta($post_id, 'savol_vsc_protocol', $protocol);
        update_post_meta($post_id, 'savol_vsc_received_at', $received_at);
        update_post_meta($post_id, 'savol_vsc_payload_raw', $payload_raw);
        update_post_meta($post_id, 'savol_vsc_payload', wp_json_encode($payload, JSON_UNESCAPED_UNICODE));
        update_post_meta($post_id, 'savol_vsc_vehicle', wp_json_encode($vehicle, JSON_UNESCAPED_UNICODE));
        update_post_meta($post_id, 'savol_vsc_seller', wp_json_encode($seller, JSON_UNESCAPED_UNICODE));
        update_post_meta($post_id, 'savol_vsc_photo_ids', implode(',', array_map('absint', $attachment_ids)));
        self::update_sell_your_car_flat_meta($post_id, $payload, $vehicle, $seller);

        $security = self::build_sell_your_car_security($payload, $protocol, $received_at, count($attachment_ids));
        update_post_meta($post_id, 'savol_vsc_security', wp_json_encode($security, JSON_UNESCAPED_UNICODE));

        return new \WP_REST_Response([
            'ok' => true,
            'protocol' => $protocol,
            'receivedAt' => $received_at,
            'leadId' => $post_id,
            'payloadReceived' => true,
            'payloadKeys' => array_keys($payload),
            'photoCount' => count($attachment_ids),
            'photoError' => (string) get_post_meta($post_id, 'savol_vsc_photo_error', true),
            'security' => $security,
        ], 201);
    }

    private static function get_sell_your_car_payload_raw(\WP_REST_Request $request): string {
        $candidates = [];

        $param_payload = $request->get_param('payload');
        if ($param_payload !== null) {
            $candidates[] = $param_payload;
        }

        $body_params = $request->get_body_params();
        if (is_array($body_params) && array_key_exists('payload', $body_params)) {
            $candidates[] = $body_params['payload'];
        }

        if (isset($_POST['payload'])) {
            $candidates[] = $_POST['payload'];
        }

        foreach ($candidates as $candidate) {
            if (is_array($candidate)) {
                $candidate = wp_json_encode($candidate, JSON_UNESCAPED_UNICODE);
            }

            $candidate = is_string($candidate) ? wp_unslash($candidate) : (string) $candidate;
            $candidate = trim($candidate);
            if ($candidate !== '') {
                return $candidate;
            }
        }

        return '';
    }

    private static function decode_sell_your_car_payload(string $payload_raw) {
        $payload_raw = preg_replace('/^\xEF\xBB\xBF/', '', $payload_raw);
        $payload_raw = trim((string) $payload_raw);

        $payload = json_decode($payload_raw, true);
        if (is_array($payload)) {
            return $payload;
        }

        $unslashed = stripslashes($payload_raw);
        if ($unslashed !== $payload_raw) {
            $payload = json_decode($unslashed, true);
            if (is_array($payload)) {
                return $payload;
            }
        }

        $decoded_entities = html_entity_decode($payload_raw, ENT_QUOTES, 'UTF-8');
        if ($decoded_entities !== $payload_raw) {
            $payload = json_decode($decoded_entities, true);
            if (is_array($payload)) {
                return $payload;
            }
        }

        return null;
    }

    private static function get_sell_your_car_files(\WP_REST_Request $request): array {
        $files = $request->get_file_params();
        if (!empty($files)) {
            return $files;
        }

        return is_array($_FILES) ? $_FILES : [];
    }

    private static function update_sell_your_car_flat_meta(int $post_id, array $payload, array $vehicle, array $seller): void {
        $consents = isset($payload['consents']) && is_array($payload['consents']) ? $payload['consents'] : [];
        $source = isset($payload['source']) && is_array($payload['source']) ? $payload['source'] : [];

        $meta = [
            'savol_vsc_vehicle_brand' => $vehicle['brand'] ?? '',
            'savol_vsc_vehicle_model' => $vehicle['model'] ?? '',
            'savol_vsc_vehicle_version' => $vehicle['version'] ?? '',
            'savol_vsc_vehicle_plate' => $vehicle['plate'] ?? '',
            'savol_vsc_vehicle_year' => $vehicle['year'] ?? '',
            'savol_vsc_vehicle_model_year' => $vehicle['modelYear'] ?? '',
            'savol_vsc_vehicle_manufacture_year' => $vehicle['manufactureYear'] ?? '',
            'savol_vsc_vehicle_fuel' => $vehicle['fuel'] ?? '',
            'savol_vsc_vehicle_transmission' => $vehicle['transmission'] ?? '',
            'savol_vsc_vehicle_km' => $vehicle['km'] ?? '',
            'savol_vsc_vehicle_color' => $vehicle['color'] ?? '',
            'savol_vsc_vehicle_plate_ending' => $vehicle['plateEnding'] ?? '',
            'savol_vsc_vehicle_body_type' => $vehicle['bodyType'] ?? '',
            'savol_vsc_vehicle_owner_count' => $vehicle['ownerCount'] ?? '',
            'savol_vsc_vehicle_has_manual' => $vehicle['hasManual'] ?? '',
            'savol_vsc_vehicle_has_spare_key' => $vehicle['hasSpareKey'] ?? '',
            'savol_vsc_vehicle_desired_price' => $vehicle['desiredPrice'] ?? '',
            'savol_vsc_vehicle_notes' => $vehicle['notes'] ?? '',
            'savol_vsc_seller_full_name' => $seller['fullName'] ?? '',
            'savol_vsc_seller_email' => $seller['email'] ?? '',
            'savol_vsc_seller_phone' => $seller['phone'] ?? '',
            'savol_vsc_seller_cpf' => $seller['cpf'] ?? '',
            'savol_vsc_seller_whatsapp' => $seller['whatsapp'] ?? '',
            'savol_vsc_seller_city' => $seller['city'] ?? '',
            'savol_vsc_seller_state' => $seller['state'] ?? '',
            'savol_vsc_seller_contact_period' => $seller['contactPeriod'] ?? '',
            'savol_vsc_seller_contact_channel' => $seller['contactChannel'] ?? '',
            'savol_vsc_consent_terms' => !empty($consents['acceptedTerms']) ? '1' : '0',
            'savol_vsc_consent_lgpd' => !empty($consents['acceptedLgpd']) ? '1' : '0',
            'savol_vsc_consent_accepted_at' => $consents['acceptedAt'] ?? '',
            'savol_vsc_source_page_url' => $source['pageUrl'] ?? '',
            'savol_vsc_source_channel' => $source['channel'] ?? '',
            'savol_vsc_source_user_agent' => $source['userAgent'] ?? '',
            'savol_vsc_source_submitted_at' => $source['submittedAt'] ?? '',
        ];

        foreach ($meta as $key => $value) {
            update_post_meta($post_id, $key, sanitize_text_field((string) $value));
        }
    }

    private static function sell_your_car_photo_fields(): array {
        return [
            'photo_vehicle' => 'Foto do carro',
            'photo_documentFront' => 'Frente do documento',
            'photo_documentBack' => 'Verso do documento',
        ];
    }

    private static function sell_your_car_optional_photo_fields(): array {
        return [
            'photo_front' => 'Frente',
            'photo_leftSide' => 'Lateral esquerda',
            'photo_rightSide' => 'Lateral direita',
            'photo_rear' => 'Traseira',
            'photo_dashboard' => 'Painel',
            'photo_odometer' => 'Odometro',
            'photo_spare' => 'Estepe',
            'photo_trunk' => 'Porta-malas',
            'photo_roof' => 'Teto',
            'photo_tire' => 'Pneu',
            'photo_engine' => 'Motor',
            'photo_chassis' => 'Chassi',
        ];
    }

    private static function sell_your_car_all_photo_fields(): array {
        return self::sell_your_car_photo_fields() + self::sell_your_car_optional_photo_fields();
    }

    private static function validate_sell_your_car_photos(array $files): string {
        foreach (self::sell_your_car_photo_fields() as $field => $label) {
            if (empty($files[$field]) || !is_array($files[$field])) {
                return 'Foto obrigatória ausente: ' . $field . '.';
            }

            $file = $files[$field];
            if (!empty($file['error'])) {
                return 'Erro no upload da foto ' . $field . '.';
            }
            if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
                return 'Upload invalido para a foto ' . $field . '.';
            }
            if ((int) ($file['size'] ?? 0) > self::SELL_YOUR_CAR_MAX_PHOTO_SIZE) {
                return 'Foto acima de 8 MB: ' . $field . '.';
            }

            $mime = (string) ($file['type'] ?? '');
            if (!str_starts_with($mime, 'image/')) {
                return 'Arquivo enviado nao e imagem: ' . $field . '.';
            }
        }

        return '';
    }

    private static function store_sell_your_car_photos(int $post_id, array $files) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $attachment_ids = [];
        $errors = [];
        foreach (self::sell_your_car_all_photo_fields() as $field => $label) {
            if (empty($files[$field]) || !is_array($files[$field])) {
                continue;
            }

            $file = $files[$field];
            $upload = wp_handle_upload($file, ['test_form' => false]);
            if (!is_array($upload) || isset($upload['error'])) {
                $message = is_array($upload) && isset($upload['error']) ? (string) $upload['error'] : 'erro desconhecido';
                $errors[] = 'Falha ao salvar a foto ' . $field . ': ' . $message;
                continue;
            }

            $attachment_id = wp_insert_attachment([
                'post_mime_type' => $upload['type'],
                'post_title' => sanitize_file_name(pathinfo((string) $file['name'], PATHINFO_FILENAME)),
                'post_content' => '',
                'post_status' => 'inherit',
                'post_parent' => $post_id,
            ], $upload['file'], $post_id, true);

            if (is_wp_error($attachment_id) || (int) $attachment_id <= 0) {
                $message = is_wp_error($attachment_id) ? $attachment_id->get_error_message() : 'ID do anexo invalido';
                $errors[] = 'Falha ao criar anexo da foto ' . $field . ': ' . $message;
                continue;
            }

            $metadata = wp_generate_attachment_metadata((int) $attachment_id, $upload['file']);
            if (is_array($metadata)) {
                wp_update_attachment_metadata((int) $attachment_id, $metadata);
            }

            update_post_meta((int) $attachment_id, 'savol_vsc_photo_field', $field);
            update_post_meta((int) $attachment_id, 'savol_vsc_photo_label', $label);
            $attachment_ids[] = (int) $attachment_id;
        }

        if (!empty($errors)) {
            update_post_meta($post_id, 'savol_vsc_photo_error', implode(' | ', $errors));
        }

        if (!empty($attachment_ids)) {
            set_post_thumbnail($post_id, $attachment_ids[0]);
        }

        return $attachment_ids;
    }

    private static function build_sell_your_car_security(array $payload, string $protocol, string $received_at, int $photo_count): array {
        $signed_payload = [
            'payload' => $payload,
            'server' => [
                'protocol' => $protocol,
                'receivedAt' => $received_at,
                'photoCount' => $photo_count,
            ],
        ];
        $secret = self::get_sell_your_car_token_secret();
        $token = $secret !== '' ? hash_hmac('sha256', wp_json_encode($signed_payload, JSON_UNESCAPED_UNICODE), $secret) : '';

        return [
            'tokenType' => 'hmac-sha256',
            'token' => $token,
            'signedFields' => ['payload', 'server.protocol', 'server.receivedAt', 'server.photoCount'],
        ];
    }

    private static function get_sell_your_car_token_secret(): string {
        if (defined('SELL_YOUR_CAR_TOKEN_SECRET')) {
            return (string) constant('SELL_YOUR_CAR_TOKEN_SECRET');
        }

        $secret = getenv('SELL_YOUR_CAR_TOKEN_SECRET');
        return is_string($secret) ? $secret : '';
    }

    private static function build_sell_your_car_title(string $protocol, array $vehicle, array $seller): string {
        $parts = [
            (string) ($seller['fullName'] ?? ''),
            (string) ($vehicle['brand'] ?? ''),
            (string) ($vehicle['model'] ?? ''),
            (string) ($vehicle['modelYear'] ?? $vehicle['year'] ?? ''),
        ];
        $title = trim(preg_replace('/\s+/', ' ', implode(' - ', array_filter($parts))));
        return $title !== '' ? $protocol . ' - ' . $title : $protocol;
    }

    private static function build_sell_your_car_content(array $payload): string {
        $vehicle = isset($payload['vehicle']) && is_array($payload['vehicle']) ? $payload['vehicle'] : [];
        $seller = isset($payload['seller']) && is_array($payload['seller']) ? $payload['seller'] : [];

        $lines = [
            'Vendedor: ' . (string) ($seller['fullName'] ?? ''),
            'E-mail: ' . (string) ($seller['email'] ?? ''),
            'Telefone: ' . (string) ($seller['phone'] ?? ''),
            'CPF: ' . (string) ($seller['cpf'] ?? ''),
            'WhatsApp: ' . (string) ($seller['whatsapp'] ?? ''),
            'Placa: ' . (string) ($vehicle['plate'] ?? ''),
            'Veiculo: ' . trim((string) ($vehicle['brand'] ?? '') . ' ' . (string) ($vehicle['model'] ?? '') . ' ' . (string) ($vehicle['version'] ?? '')),
            'Ano modelo: ' . (string) ($vehicle['modelYear'] ?? $vehicle['year'] ?? ''),
            'Ano fabricacao: ' . (string) ($vehicle['manufactureYear'] ?? ''),
            'KM: ' . (string) ($vehicle['km'] ?? ''),
            'Preco desejado: ' . (string) ($vehicle['desiredPrice'] ?? ''),
            '',
            'Payload completo salvo no campo personalizado savol_vsc_payload.',
        ];

        return implode("\n", $lines);
    }

    private static function generate_sell_your_car_protocol(): string {
        return 'SAVOL-VSC-' . gmdate('Ymd-His') . '-' . wp_generate_password(6, false, false);
    }

    private static function sell_your_car_error(string $message, int $status): \WP_REST_Response {
        return new \WP_REST_Response([
            'ok' => false,
            'error' => $message,
        ], $status);
    }

    public static function enqueue_admin_assets(string $hook): void {
        global $post_type;
        $taxonomy = isset($_GET['taxonomy']) ? sanitize_key((string) $_GET['taxonomy']) : '';

        $is_veiculo_post_screen = ($hook === 'post.php' || $hook === 'post-new.php') && $post_type === self::POST_TYPE;
        $is_tax_screen = ($hook === 'edit-tags.php' || $hook === 'term.php') && in_array($taxonomy, ['veiculo_cor', 'veiculo_marca'], true);
        $is_autosync_screen = $hook === 'veiculo_page_savol-veiculos-autosync';

        if (!$is_veiculo_post_screen && !$is_tax_screen && !$is_autosync_screen) {
            return;
        }

        $css = '
            .savol-veiculos-grid {
                display: grid;
                gap: 14px;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            }
            .savol-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .savol-field label {
                font-weight: 600;
            }
            .savol-field input[type="text"],
            .savol-field input[type="number"] {
                width: 100%;
            }
            .savol-switch {
                align-items: center;
                display: inline-flex;
            }
            .savol-switch input {
                display: none;
            }
            .savol-slider {
                position: relative;
                width: 44px;
                height: 24px;
                border-radius: 24px;
                background: #ccd0d4;
                transition: 0.2s;
            }
            .savol-slider::before {
                content: "";
                position: absolute;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                top: 3px;
                left: 3px;
                background: #fff;
                transition: 0.2s;
            }
            .savol-switch input:checked + .savol-slider {
                background: #2271b1;
            }
            .savol-switch input:checked + .savol-slider::before {
                transform: translateX(20px);
            }
            .savol-term-logo-preview {
                margin-top: 8px;
                max-width: 120px;
                max-height: 120px;
                display: block;
            }
            .savol-gallery-preview {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 8px;
            }
            .savol-gallery-preview img {
                width: 80px;
                height: 80px;
                object-fit: cover;
                border-radius: 4px;
                border: 1px solid #dcdcde;
            }
        ';

        wp_register_style('savol-veiculos-admin', false);
        wp_enqueue_style('savol-veiculos-admin');
        wp_add_inline_style('savol-veiculos-admin', $css);

        if ($is_tax_screen) {
            if ($taxonomy === 'veiculo_cor') {
                wp_enqueue_style('wp-color-picker');
                wp_enqueue_script('wp-color-picker');
                wp_add_inline_script('wp-color-picker', 'jQuery(function($){$(".savol-color-field").wpColorPicker();});');
            }

            if ($taxonomy === 'veiculo_marca') {
                wp_enqueue_media();
                $logo_js = <<<JS
jQuery(function($){
    var frame;
    function openFrame(){
        if (frame) {
            frame.open();
            return;
        }
        frame = wp.media({
            title: 'Selecionar logo da marca',
            button: { text: 'Usar esta imagem' },
            library: { type: ['image/png', 'image/webp'] },
            multiple: false
        });
        frame.on('select', function(){
            var attachment = frame.state().get('selection').first().toJSON();
            var mime = attachment.mime || '';
            if (mime !== 'image/png' && mime !== 'image/webp') {
                window.alert('Use apenas imagens PNG ou WebP.');
                return;
            }
            $('.savol-marca-logo-id').val(attachment.id);
            $('.savol-term-logo-preview').attr('src', attachment.url).show();
        });
        frame.open();
    }
    $(document).on('click', '.savol-marca-logo-upload', function(e){
        e.preventDefault();
        openFrame();
    });
    $(document).on('click', '.savol-marca-logo-remove', function(e){
        e.preventDefault();
        $('.savol-marca-logo-id').val('');
        $('.savol-term-logo-preview').attr('src', '').hide();
    });
});
JS;
                wp_add_inline_script('jquery-core', $logo_js);
            }
        }

        if ($is_veiculo_post_screen) {
            wp_enqueue_media();
            $gallery_js = <<<JS
jQuery(function($){
    var frame;
    function renderPreview(ids, container){
        container.empty();
        ids.forEach(function(id){
            var attachment = wp.media.attachment(id);
            attachment.fetch().then(function(){
                var sizes = attachment.get('sizes');
                var url = (sizes && sizes.thumbnail ? sizes.thumbnail.url : attachment.get('url'));
                if (url) {
                    container.append($('<img>', { src: url, alt: '' }));
                }
            });
        });
    }
    $(document).on('click', '.savol-gallery-open', function(e){
        e.preventDefault();
        var wrap = $(this).closest('.savol-field');
        var input = wrap.find('.savol-gallery-ids');
        var preview = wrap.find('.savol-gallery-preview');
        var selected = input.val() ? input.val().split(',').map(Number).filter(Boolean) : [];
        frame = wp.media({
            title: 'Selecionar fotos do veiculo',
            button: { text: 'Usar fotos' },
            multiple: true
        });
        frame.on('open', function(){
            var selection = frame.state().get('selection');
            selected.forEach(function(id){
                var attachment = wp.media.attachment(id);
                attachment.fetch();
                selection.add(attachment);
            });
        });
        frame.on('select', function(){
            var ids = frame.state().get('selection').map(function(item){ return item.get('id'); });
            input.val(ids.join(','));
            renderPreview(ids, preview);
        });
        frame.open();
    });
    $(document).on('click', '.savol-gallery-clear', function(e){
        e.preventDefault();
        var wrap = $(this).closest('.savol-field');
        wrap.find('.savol-gallery-ids').val('');
        wrap.find('.savol-gallery-preview').empty();
    });
});
JS;
            wp_add_inline_script('jquery-core', $gallery_js);
        }

        if ($is_autosync_screen) {
            $autosync_nonce = wp_create_nonce('savol_veiculos_run_autosync');
            $autosync_js = <<<JS
jQuery(function($){
    var btn = $('#savol-autosync-run');
    var wrap = $('#savol-autosync-progress-wrap');
    var bar = $('#savol-autosync-progress-bar');
    var text = $('#savol-autosync-progress-text');
    function setProgress(percent, message){
        bar.css('width', percent + '%');
        text.text(message);
    }
    function poll(){
        $.post(ajaxurl, { action: 'savol_veiculos_autosync_progress' }).done(function(resp){
            if (!resp || !resp.success) {
                return;
            }
            var p = resp.data || {};
            var percent = p.percent || 0;
            var message = p.message || 'Processando...';
            setProgress(percent, message);
            if (p.status === 'running' || p.status === 'queued') {
                wrap.show();
                btn.prop('disabled', true);
                setTimeout(poll, 1200);
                return;
            }
            if (p.status === 'done' || p.status === 'error') {
                wrap.show();
                btn.prop('disabled', false);
            }
        });
    }
    poll();
    btn.on('click', function(){
        btn.prop('disabled', true);
        wrap.show();
        setProgress(1, 'Iniciando sincronizacao...');
        $.post(ajaxurl, { action: 'savol_veiculos_run_autosync', nonce: '{$autosync_nonce}' })
            .done(function(resp){
                if (resp && resp.success) {
                    setProgress(1, resp.data && resp.data.message ? resp.data.message : 'Sincronizacao enfileirada.');
                    poll();
                    return;
                }
                var msg = (resp && resp.data && resp.data.message) ? resp.data.message : 'Falha na sincronizacao.';
                setProgress(100, msg);
                btn.prop('disabled', false);
            })
            .fail(function(xhr){
                var msg = 'Falha na sincronizacao.';
                if (xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
                    msg = xhr.responseJSON.data.message;
                }
                setProgress(100, msg);
                btn.prop('disabled', false);
            });
    });
});
JS;
            wp_add_inline_script('jquery-core', $autosync_js);
        }
    }

    public static function register_admin_menu(): void {
        add_submenu_page(
            'edit.php?post_type=' . self::POST_TYPE,
            'AutoSync',
            'AutoSync',
            'manage_options',
            'savol-veiculos-autosync',
            [__CLASS__, 'render_autosync_page']
        );
    }

    public static function render_autosync_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }

        $sync_status = isset($_GET['sync']) ? sanitize_text_field((string) $_GET['sync']) : '';
        $saved_status = isset($_GET['saved']) ? sanitize_text_field((string) $_GET['saved']) : '';
        ?>
        <div class="wrap">
            <h1>AutoSync de Veiculos</h1>
            <?php if ($saved_status === '1') : ?>
                <div class="notice notice-success is-dismissible"><p>Token salvo com sucesso.</p></div>
            <?php endif; ?>
            <?php if ($sync_status === 'ok') : ?>
                <div class="notice notice-success is-dismissible"><p>Sincronizacao concluida.</p></div>
            <?php elseif ($sync_status === 'queued') : ?>
                <div class="notice notice-info is-dismissible"><p>Importacao enfileirada. O processamento continuara em segundo plano.</p></div>
            <?php elseif ($sync_status === 'error') : ?>
                <div class="notice notice-error is-dismissible"><p>Falha na sincronizacao. Verifique o token e tente novamente.</p></div>
                <?php $last_error = (string) get_option(self::AUTOSYNC_LAST_ERROR_OPTION, ''); ?>
                <?php if ($last_error !== '') : ?>
                    <div class="notice notice-warning"><p><strong>Detalhe:</strong> <?php echo esc_html($last_error); ?></p></div>
                <?php endif; ?>
            <?php endif; ?>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="savol_veiculos_save_autosync" />
                <?php wp_nonce_field('savol_veiculos_save_autosync', 'savol_veiculos_autosync_nonce'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="savol_autosync_endpoint">URL da API</label></th>
                        <td>
                            <input type="url" id="savol_autosync_endpoint" name="savol_autosync_endpoint" class="regular-text" value="<?php echo esc_attr(self::get_autosync_endpoint()); ?>" />
                            <p class="description">Rota do estoque para sincronizacao (ex.: https://sync-backend.autoavaliar.com.br/vehicle/stock).</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="savol_autosync_token">Token da API</label></th>
                        <td>
                            <input type="password" id="savol_autosync_token" name="savol_autosync_token" class="regular-text" autocomplete="new-password" />
                            <p class="description">O token fica armazenado de forma protegida no banco e nao e exibido no painel.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Salvar token'); ?>
            </form>

            <p>
                <button type="button" class="button button-primary" id="savol-autosync-run">Sincronizar estoque agora</button>
            </p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin:10px 0 18px;">
                <input type="hidden" name="action" value="savol_veiculos_refresh_unidades" />
                <?php wp_nonce_field('savol_veiculos_refresh_unidades', 'savol_veiculos_refresh_unidades_nonce'); ?>
                <?php submit_button('Reaplicar contatos das unidades', 'secondary', 'submit', false); ?>
            </form>
            <div id="savol-autosync-progress-wrap" style="display:none;max-width:560px;">
                <div style="height:18px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
                    <div id="savol-autosync-progress-bar" style="height:100%;width:0;background:#2271b1;transition:width .2s ease;"></div>
                </div>
                <p id="savol-autosync-progress-text">Aguardando...</p>
            </div>
            <?php wp_nonce_field('savol_veiculos_run_autosync', 'savol_veiculos_run_nonce'); ?>

            <hr style="margin:24px 0;" />
            <h2>Importacao Manual (sem API)</h2>
            <p class="description">Cole aqui o JSON bruto com formato <code>vehicles.rows</code> para importar sem depender da autenticacao da API.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="savol_veiculos_import_json" />
                <?php wp_nonce_field('savol_veiculos_import_json', 'savol_veiculos_import_json_nonce'); ?>
                <textarea name="savol_autosync_json_payload" rows="12" style="width:100%;max-width:960px;"></textarea>
                <p><?php submit_button('Importar JSON manualmente', 'secondary', 'submit', false); ?></p>
            </form>
        </div>
        <?php
    }

    public static function handle_save_autosync(): void {
        if (!current_user_can('manage_options')) {
            wp_die('Sem permissao.');
        }
        if (!isset($_POST['savol_veiculos_autosync_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['savol_veiculos_autosync_nonce'])), 'savol_veiculos_save_autosync')) {
            wp_die('Nonce invalido.');
        }

        $token = isset($_POST['savol_autosync_token']) ? trim((string) wp_unslash($_POST['savol_autosync_token'])) : '';
        $endpoint = isset($_POST['savol_autosync_endpoint']) ? trim((string) wp_unslash($_POST['savol_autosync_endpoint'])) : '';
        if ($endpoint !== '') {
            update_option(self::AUTOSYNC_ENDPOINT_OPTION, esc_url_raw($endpoint), false);
        }
        if ($token !== '') {
            update_option(self::AUTOSYNC_OPTION, self::encrypt_token($token), false);
        }

        wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=savol-veiculos-autosync&saved=1'));
        exit;
    }

    public static function handle_run_autosync(): void {
        if (!current_user_can('manage_options')) {
            wp_die('Sem permissao.');
        }
        if (!isset($_POST['savol_veiculos_run_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['savol_veiculos_run_nonce'])), 'savol_veiculos_run_autosync')) {
            wp_die('Nonce invalido.');
        }

        $token = self::decrypt_token((string) get_option(self::AUTOSYNC_OPTION, ''));
        if ($token === '') {
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, 'Token vazio ou invalido.', false);
            wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=savol-veiculos-autosync&sync=error'));
            exit;
        }

        $ok = self::run_autosync($token);
        wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=savol-veiculos-autosync&sync=' . ($ok ? 'ok' : 'error')));
        exit;
    }

    public static function handle_run_autosync_ajax(): void {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Sem permissao.'], 403);
        }
        if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'savol_veiculos_run_autosync')) {
            wp_send_json_error(['message' => 'Nonce invalido.'], 400);
        }

        $token = self::decrypt_token((string) get_option(self::AUTOSYNC_OPTION, ''));
        if ($token === '') {
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, 'Token vazio ou invalido.', false);
            wp_send_json_error(['message' => 'Token vazio ou invalido.'], 400);
        }

        $progress = get_option(self::AUTOSYNC_PROGRESS_OPTION, []);
        if (is_array($progress) && isset($progress['status']) && in_array($progress['status'], ['queued', 'running'], true)) {
            wp_send_json_success(['message' => 'Sincronizacao ja em andamento.']);
        }

        self::update_progress([
            'status' => 'queued',
            'processed' => 0,
            'total' => 0,
            'percent' => 0,
            'message' => 'Sincronizacao enfileirada...',
        ]);

        self::schedule_autosync_cron();
        wp_send_json_success(['message' => 'Sincronizacao enfileirada e iniciada em segundo plano.']);
    }

    public static function handle_autosync_progress_ajax(): void {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Sem permissao.'], 403);
        }
        $progress = get_option(self::AUTOSYNC_PROGRESS_OPTION, []);
        if (!is_array($progress)) {
            $progress = [];
        }
        wp_send_json_success($progress);
    }

    public static function run_autosync_cron_job(): void {
        if (self::process_queued_vehicles_batch()) {
            return;
        }

        $token = self::decrypt_token((string) get_option(self::AUTOSYNC_OPTION, ''));
        if ($token === '') {
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, 'Token vazio ou invalido.', false);
            self::update_progress([
                'status' => 'error',
                'processed' => 0,
                'total' => 0,
                'percent' => 100,
                'message' => 'Token vazio ou invalido.',
            ]);
            return;
        }
        self::run_autosync($token);
    }

    public static function handle_refresh_unidades(): void {
        if (!current_user_can('manage_options')) {
            wp_die('Sem permissao.');
        }
        if (!isset($_POST['savol_veiculos_refresh_unidades_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['savol_veiculos_refresh_unidades_nonce'])), 'savol_veiculos_refresh_unidades')) {
            wp_die('Nonce invalido.');
        }

        $terms = get_terms([
            'taxonomy' => 'veiculo_unidade',
            'hide_empty' => false,
        ]);
        if (!is_wp_error($terms)) {
            foreach ($terms as $term) {
                $contacts = self::find_unidade_contacts((string) $term->name);
                if (empty($contacts)) {
                    continue;
                }
                if (!empty($contacts['telefone'])) {
                    update_term_meta((int) $term->term_id, 'veiculo_unidade_telefone', $contacts['telefone']);
                }
                if (!empty($contacts['whatsapp'])) {
                    update_term_meta((int) $term->term_id, 'veiculo_unidade_whatsapp', $contacts['whatsapp']);
                }
                if (!empty($contacts['email'])) {
                    update_term_meta((int) $term->term_id, 'veiculo_unidade_email', $contacts['email']);
                }
                if (!empty($contacts['endereco'])) {
                    update_term_meta((int) $term->term_id, 'veiculo_unidade_endereco', $contacts['endereco']);
                }
            }
        }

        wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=savol-veiculos-autosync&saved=1'));
        exit;
    }

    public static function handle_import_json(): void {
        if (!current_user_can('manage_options')) {
            wp_die('Sem permissao.');
        }
        if (!isset($_POST['savol_veiculos_import_json_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['savol_veiculos_import_json_nonce'])), 'savol_veiculos_import_json')) {
            wp_die('Nonce invalido.');
        }

        $raw_json = isset($_POST['savol_autosync_json_payload']) ? (string) wp_unslash($_POST['savol_autosync_json_payload']) : '';
        if (trim($raw_json) === '') {
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, 'JSON manual vazio.', false);
            wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=savol-veiculos-autosync&sync=error'));
            exit;
        }

        $payload = json_decode($raw_json, true);
        if (!is_array($payload)) {
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, 'JSON manual invalido.', false);
            wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=savol-veiculos-autosync&sync=error'));
            exit;
        }

        $ok = self::enqueue_vehicles_payload($payload, 'manual');
        if ($ok) {
            self::schedule_autosync_cron();
        }
        wp_safe_redirect(admin_url('edit.php?post_type=' . self::POST_TYPE . '&page=savol-veiculos-autosync&sync=' . ($ok ? 'queued' : 'error')));
        exit;
    }

    private static function run_autosync(string $token): bool {
        self::update_progress([
            'status' => 'running',
            'processed' => 0,
            'total' => 0,
            'percent' => 0,
            'message' => 'Conectando na API...',
        ]);

        $endpoints = self::get_autosync_endpoint_candidates();
        $attempts = [];
        foreach ($endpoints as $endpoint) {
            $attempts[] = [
                'method' => 'GET',
                'url' => $endpoint,
                'headers' => ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json'],
            ];
            $attempts[] = [
                'method' => 'GET',
                'url' => $endpoint,
                'headers' => ['Authorization' => $token, 'Content-Type' => 'application/json'],
            ];
            $attempts[] = [
                'method' => 'GET',
                'url' => $endpoint,
                'headers' => ['x-access-token' => $token, 'Content-Type' => 'application/json'],
            ];
            $attempts[] = [
                'method' => 'GET',
                'url' => $endpoint,
                'headers' => ['token' => $token, 'Content-Type' => 'application/json'],
            ];
            $attempts[] = [
                'method' => 'POST',
                'url' => $endpoint,
                'headers' => ['Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $token],
                'body' => wp_json_encode([]),
            ];
        }
        $response = null;
        $last_error = '';
        $attempt_logs = [];
        $best_error = '';

        foreach ($attempts as $attempt) {
            $args = [
                'timeout' => 60,
                'method' => $attempt['method'],
                'headers' => $attempt['headers'],
                'user-agent' => 'SavolVeiculosAutoSync/1.1.2; WordPress',
            ];
            if (isset($attempt['body'])) {
                $args['body'] = $attempt['body'];
            }

            $response = wp_remote_request($attempt['url'], $args);
            if (is_wp_error($response)) {
                $last_error = $response->get_error_message();
                $attempt_logs[] = self::mask_sensitive((string) $attempt['url']) . ' => WP_Error: ' . $last_error;
                continue;
            }
            $code = (int) wp_remote_retrieve_response_code($response);
            if ($code < 300) {
                break;
            }
            $body = (string) wp_remote_retrieve_body($response);
            $safe_url = self::mask_sensitive((string) $attempt['url']);
            $last_error = 'HTTP ' . $code . ' em ' . $safe_url . ' - ' . mb_substr(wp_strip_all_tags($body), 0, 200);
            $attempt_logs[] = $safe_url . ' => HTTP ' . $code;

            if ($code === 401 || $code === 403) {
                $best_error = $last_error;
                break;
            }
            if ($code === 429) {
                $best_error = 'HTTP 429 - limite de requisicoes. Aguarde 1-2 minutos e tente novamente.';
                break;
            }
            if ($best_error === '' && $code >= 500) {
                $best_error = $last_error;
            }
            usleep(250000);
        }

        if (is_wp_error($response)) {
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, $last_error, false);
            self::update_progress(['status' => 'error', 'percent' => 100, 'message' => $last_error]);
            return false;
        }
        if ((int) wp_remote_retrieve_response_code($response) >= 300) {
            $msg = $best_error !== '' ? $best_error : ($last_error !== '' ? $last_error : 'Resposta HTTP invalida.');
            if (!empty($attempt_logs)) {
                $msg .= ' | Tentativas: ' . implode(' ; ', $attempt_logs);
            }
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, $msg, false);
            self::update_progress(['status' => 'error', 'percent' => 100, 'message' => $msg]);
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $payload = json_decode($body, true);
        return self::process_vehicles_payload($payload);
    }

    private static function process_vehicles_payload($payload): bool {
        if (!self::enqueue_vehicles_payload($payload, 'api')) {
            return false;
        }

        return self::process_queued_vehicles_batch();
    }

    private static function enqueue_vehicles_payload($payload, string $source): bool {
        if (!is_array($payload) || !isset($payload['vehicles']['rows']) || !is_array($payload['vehicles']['rows'])) {
            update_option(self::AUTOSYNC_LAST_ERROR_OPTION, 'JSON retornado nao esta no formato esperado (vehicles.rows).', false);
            self::update_progress(['status' => 'error', 'percent' => 100, 'message' => 'JSON fora do formato esperado.']);
            return false;
        }

        $rows = $payload['vehicles']['rows'];
        $total = count($rows);
        if ($total <= 0) {
            delete_option(self::AUTOSYNC_BATCH_OPTION);
            delete_option(self::AUTOSYNC_LAST_ERROR_OPTION);
            self::update_progress([
                'status' => 'done',
                'processed' => 0,
                'total' => 0,
                'percent' => 100,
                'message' => 'Nenhum veiculo para importar.',
            ]);
            return true;
        }

        update_option(self::AUTOSYNC_BATCH_OPTION, [
            'source' => $source,
            'rows' => array_values($rows),
            'index' => 0,
            'total' => $total,
            'started_at' => time(),
        ], false);

        self::update_progress([
            'status' => 'queued',
            'processed' => 0,
            'total' => $total,
            'percent' => 0,
            'message' => 'Importacao enfileirada com ' . $total . ' veiculos.',
        ]);

        return true;
    }

    private static function process_queued_vehicles_batch(): bool {
        $batch = get_option(self::AUTOSYNC_BATCH_OPTION, []);
        if (!is_array($batch) || empty($batch['rows']) || !isset($batch['index'], $batch['total'])) {
            return false;
        }

        $rows = is_array($batch['rows']) ? $batch['rows'] : [];
        $total = (int) $batch['total'];
        $index = max(0, (int) $batch['index']);
        $start = time();
        $processed_in_batch = 0;

        while ($index < $total && $processed_in_batch < self::AUTOSYNC_BATCH_SIZE && (time() - $start) < self::AUTOSYNC_BATCH_TIME_LIMIT) {
            $vehicle = $rows[$index] ?? null;
            $index++;

            if (!is_array($vehicle) || !isset($vehicle['id'])) {
                continue;
            }

            self::upsert_vehicle($vehicle);
            $processed_in_batch++;
            $percent = $total > 0 ? (int) floor(($index / $total) * 100) : 100;
            self::update_progress([
                'status' => 'running',
                'processed' => $index,
                'total' => $total,
                'percent' => $percent,
                'message' => 'Importando veiculo ' . $index . ' de ' . $total,
            ]);
        }

        if ($index < $total) {
            $batch['index'] = $index;
            update_option(self::AUTOSYNC_BATCH_OPTION, $batch, false);
            $percent = $total > 0 ? (int) floor(($index / $total) * 100) : 100;
            self::update_progress([
                'status' => 'running',
                'processed' => $index,
                'total' => $total,
                'percent' => $percent,
                'message' => 'Importacao em segundo plano: ' . $index . ' de ' . $total,
            ]);
            self::schedule_autosync_cron();
            return true;
        }

        delete_option(self::AUTOSYNC_BATCH_OPTION);
        delete_option(self::AUTOSYNC_LAST_ERROR_OPTION);
        self::update_progress([
            'status' => 'done',
            'processed' => $total,
            'total' => $total,
            'percent' => 100,
            'message' => 'Sincronizacao concluida.',
        ]);
        return true;
    }

    private static function schedule_autosync_cron(): void {
        if (!wp_next_scheduled('savol_veiculos_run_autosync_cron')) {
            wp_schedule_single_event(time() + 5, 'savol_veiculos_run_autosync_cron');
        }
    }

    private static function upsert_vehicle(array $vehicle): void {
        $external_id = (string) $vehicle['id'];
        $plate = self::normalize_plate((string) ($vehicle['plate'] ?? ''));
        $existing = get_posts([
            'post_type' => self::POST_TYPE,
            'post_status' => 'any',
            'meta_key' => 'identificador_externo',
            'meta_value' => $external_id,
            'posts_per_page' => 1,
            'fields' => 'ids',
        ]);
        $post_id_by_external = !empty($existing) ? (int) $existing[0] : 0;
        $post_id_by_plate_oldest = $plate !== '' ? self::find_oldest_post_id_by_plate($plate) : 0;
        $post_id = $post_id_by_plate_oldest > 0 ? $post_id_by_plate_oldest : $post_id_by_external;

        $title_parts = [
            isset($vehicle['brandName']) ? (string) $vehicle['brandName'] : '',
            isset($vehicle['modelName']) ? (string) $vehicle['modelName'] : '',
            isset($vehicle['versionName']) ? (string) $vehicle['versionName'] : '',
            isset($vehicle['modelYear']) ? (string) $vehicle['modelYear'] : '',
        ];
        $title = trim(preg_replace('/\s+/', ' ', implode(' ', array_filter($title_parts))));
        if ($title === '') {
            $title = 'Veiculo ' . $external_id;
        }

        $postarr = [
            'post_type' => self::POST_TYPE,
            'post_title' => $title,
            'post_status' => 'publish',
            'post_content' => isset($vehicle['comments']) ? wp_kses_post((string) $vehicle['comments']) : '',
        ];
        if ($post_id > 0) {
            $postarr['ID'] = $post_id;
            $post_id = (int) wp_update_post($postarr, true);
        } else {
            $post_id = (int) wp_insert_post($postarr, true);
        }
        if ($post_id <= 0 || is_wp_error($post_id)) {
            return;
        }

        update_post_meta($post_id, 'identificador_externo', $external_id);
        update_post_meta($post_id, 'placa', $plate);
        update_post_meta($post_id, 'renavam', (string) ($vehicle['renavam'] ?? ''));
        update_post_meta($post_id, 'chassi_vin', (string) ($vehicle['vin'] ?? ''));
        update_post_meta($post_id, 'ano', is_numeric($vehicle['manufacturingYear'] ?? null) ? (float) $vehicle['manufacturingYear'] : 0);
        update_post_meta($post_id, 'ano_modelo', is_numeric($vehicle['modelYear'] ?? null) ? (float) $vehicle['modelYear'] : 0);
        update_post_meta($post_id, 'km', is_numeric($vehicle['kilometers'] ?? null) ? (float) $vehicle['kilometers'] : 0);
        update_post_meta($post_id, 'preco', is_numeric($vehicle['value'] ?? null) ? (float) $vehicle['value'] : 0);
        update_post_meta($post_id, 'status', isset($vehicle['status']) ? (string) $vehicle['status'] : '');
        update_post_meta($post_id, 'combustivel', (string) ($vehicle['fuelName'] ?? ''));
        update_post_meta($post_id, 'cambio', (string) ($vehicle['transmissionName'] ?? ''));
        update_post_meta($post_id, 'categoria', (string) ($vehicle['section'] ?? ''));
        update_post_meta($post_id, 'carroceria', (string) ($vehicle['section'] ?? ''));
        update_post_meta($post_id, 'portas', is_numeric($vehicle['doors'] ?? null) ? (float) $vehicle['doors'] : 0);
        update_post_meta($post_id, 'lugares', is_numeric($vehicle['passengers'] ?? null) ? (float) $vehicle['passengers'] : 0);
        update_post_meta($post_id, 'tracao', '');
        update_post_meta($post_id, 'motor', isset($vehicle['engineCapacity']) ? (string) $vehicle['engineCapacity'] : '');
        update_post_meta($post_id, 'potencia_cv', is_numeric($vehicle['power'] ?? null) ? (float) $vehicle['power'] : 0);
        update_post_meta($post_id, 'torque_nm', 0);
        update_post_meta($post_id, 'qtd_donos', 0);
        update_post_meta($post_id, 'condicao', isset($vehicle['conditionType']) ? (string) $vehicle['conditionType'] : '');
        update_post_meta($post_id, 'ipva_pago', 0);
        update_post_meta($post_id, 'licenciado', 0);
        update_post_meta($post_id, 'blindado', 0);

        self::set_term_if_value($post_id, 'veiculo_marca', (string) ($vehicle['brandName'] ?? ''));
        self::set_term_if_value($post_id, 'veiculo_modelo', (string) ($vehicle['modelName'] ?? ''));
        self::set_term_if_value($post_id, 'veiculo_versao', (string) ($vehicle['versionName'] ?? ''));
        self::set_term_if_value($post_id, 'veiculo_cor', (string) ($vehicle['colorName'] ?? ''));
        self::set_term_if_value($post_id, 'veiculo_cidade', self::extract_city((string) ($vehicle['entityName'] ?? '')));
        self::set_term_if_value($post_id, 'veiculo_uf', 'SP');
        self::assign_unidade_term_with_contacts($post_id, (string) ($vehicle['entityName'] ?? ''));
        self::assign_informacao_destaque_terms($post_id, $vehicle);
        self::assign_destaque_secundario_terms($post_id, $vehicle);

        $photo_urls = [];
        if (isset($vehicle['VehiclePhotos']) && is_array($vehicle['VehiclePhotos'])) {
            foreach ($vehicle['VehiclePhotos'] as $photo) {
                if (is_array($photo) && !empty($photo['link'])) {
                    $photo_urls[] = esc_url_raw((string) $photo['link']);
                }
            }
        }
        update_post_meta($post_id, 'autosync_photo_urls', implode("\n", $photo_urls));
        self::import_vehicle_photos_to_gallery($post_id, $vehicle);
        if ($plate !== '') {
            self::cleanup_duplicate_plate_posts($post_id, $plate);
        }
    }

    private static function assign_informacao_destaque_terms(int $post_id, array $vehicle): void {
        $terms = self::extract_named_items($vehicle['VehicleFeatures'] ?? []);
        wp_set_object_terms($post_id, $terms, 'veiculo_informacao_destaque', false);
    }

    private static function assign_destaque_secundario_terms(int $post_id, array $vehicle): void {
        $terms = [];
        $km = is_numeric($vehicle['kilometers'] ?? null) ? (float) $vehicle['kilometers'] : 0;
        $price = is_numeric($vehicle['value'] ?? null) ? (float) $vehicle['value'] : 0;
        $fipe = is_numeric($vehicle['fipeValue'] ?? null) ? (float) $vehicle['fipeValue'] : 0;

        if ($km > 0 && $km < 30000) {
            $terms[] = 'Baixa km';
        }

        if ($price > 0 && $fipe > 0) {
            if ($price < $fipe) {
                $terms[] = 'Abaixo da fipe';
            } elseif ($price > $fipe && !self::has_avaria_photo($vehicle)) {
                $terms[] = 'Impecável';
            }
        }

        if (self::has_complete_optionals($vehicle)) {
            $terms[] = 'Completo';
        }

        wp_set_object_terms($post_id, array_values(array_unique($terms)), 'veiculo_destaque_secundario', false);
    }

    private static function extract_named_items($items): array {
        if (!is_array($items)) {
            return [];
        }

        $names = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $name = '';
            foreach (['optionalName', 'name', 'label', 'title'] as $key) {
                if (!empty($item[$key])) {
                    $name = (string) $item[$key];
                    break;
                }
            }

            $name = trim($name);
            if ($name !== '') {
                $names[] = $name;
            }
        }

        return array_values(array_unique($names));
    }

    private static function has_avaria_photo(array $vehicle): bool {
        if (empty($vehicle['VehiclePhotos']) || !is_array($vehicle['VehiclePhotos'])) {
            return false;
        }

        foreach ($vehicle['VehiclePhotos'] as $photo) {
            if (!is_array($photo)) {
                continue;
            }
            $label = self::canonicalize_text((string) ($photo['label'] ?? ''));
            if (str_contains($label, 'avaria')) {
                return true;
            }
        }

        return false;
    }

    private static function has_complete_optionals(array $vehicle): bool {
        $optionals = array_merge(
            self::extract_named_items($vehicle['VehicleOptionals'] ?? []),
            self::extract_named_items($vehicle['VehicleEquipments'] ?? [])
        );
        $normalized = array_map([__CLASS__, 'canonicalize_text'], $optionals);
        $matched = 0;

        $rules = [
            ['ar condicionado'],
            ['direcao hidraulica', 'direcao eletrica'],
            ['vidro eletrico', 'vidros eletricos'],
            ['trava eletrica', 'travas eletricas'],
            ['retrovisor eletrico', 'retrovisores eletricos'],
            ['airbag'],
            ['freio abs', 'freios abs', 'abs'],
            ['alarme'],
            ['som', 'central multimidia', 'multimidia', 'multimedia'],
        ];

        foreach ($rules as $needles) {
            if (self::optional_list_contains_any($normalized, $needles)) {
                $matched++;
            }
        }

        return $matched >= 8;
    }

    private static function optional_list_contains_any(array $optionals, array $needles): bool {
        foreach ($optionals as $optional) {
            foreach ($needles as $needle) {
                if (str_contains($optional, $needle)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static function normalize_plate(string $plate): string {
        $plate = strtoupper(trim($plate));
        $plate = preg_replace('/[^A-Z0-9]/', '', $plate);
        return (string) $plate;
    }

    private static function find_oldest_post_id_by_plate(string $plate): int {
        $plate = self::normalize_plate($plate);
        if ($plate === '') {
            return 0;
        }

        $query = new \WP_Query([
            'post_type' => self::POST_TYPE,
            'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
            'posts_per_page' => 1,
            'fields' => 'ids',
            'meta_query' => [
                [
                    'key' => 'placa',
                    'value' => $plate,
                    'compare' => '=',
                ],
            ],
            'orderby' => [
                'date' => 'ASC',
                'ID' => 'ASC',
            ],
        ]);

        if (!empty($query->posts)) {
            return (int) $query->posts[0];
        }

        return 0;
    }

    private static function cleanup_duplicate_plate_posts(int $keep_post_id, string $plate): void {
        $plate = self::normalize_plate($plate);
        if ($plate === '' || $keep_post_id <= 0) {
            return;
        }

        $query = new \WP_Query([
            'post_type' => self::POST_TYPE,
            'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
            'posts_per_page' => -1,
            'fields' => 'ids',
            'meta_query' => [
                [
                    'key' => 'placa',
                    'value' => $plate,
                    'compare' => '=',
                ],
            ],
        ]);

        if (empty($query->posts)) {
            return;
        }

        foreach ($query->posts as $duplicate_id) {
            $duplicate_id = (int) $duplicate_id;
            if ($duplicate_id === $keep_post_id) {
                continue;
            }
            wp_trash_post($duplicate_id);
        }
    }

    private static function import_vehicle_photos_to_gallery(int $post_id, array $vehicle): void {
        if (empty($vehicle['VehiclePhotos']) || !is_array($vehicle['VehiclePhotos'])) {
            return;
        }

        usort($vehicle['VehiclePhotos'], static function ($a, $b) {
            $orderA = isset($a['order']) ? (int) $a['order'] : 9999;
            $orderB = isset($b['order']) ? (int) $b['order'] : 9999;
            return $orderA <=> $orderB;
        });

        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $gallery_ids = [];
        add_filter('http_request_timeout', [__CLASS__, 'get_photo_import_timeout']);
        try {
            foreach ($vehicle['VehiclePhotos'] as $photo) {
                if (!is_array($photo) || empty($photo['link'])) {
                    continue;
                }
                $url = esc_url_raw((string) $photo['link']);
                if ($url === '') {
                    continue;
                }

                $attachment_id = self::find_attachment_by_source_url($url);
                if ($attachment_id <= 0) {
                    $attachment_id = media_sideload_image($url, $post_id, null, 'id');
                    if (is_wp_error($attachment_id)) {
                        continue;
                    }
                    $attachment_id = (int) $attachment_id;
                    if ($attachment_id <= 0) {
                        continue;
                    }
                    update_post_meta($attachment_id, '_savol_source_url', $url);
                }

                wp_update_post(['ID' => $attachment_id, 'post_parent' => $post_id]);
                $gallery_ids[] = $attachment_id;
            }
        } finally {
            remove_filter('http_request_timeout', [__CLASS__, 'get_photo_import_timeout']);
        }

        if (!empty($gallery_ids)) {
            $gallery_ids = array_values(array_unique(array_map('absint', $gallery_ids)));
            update_post_meta($post_id, 'galeria_fotos', implode(',', $gallery_ids));
            if (!has_post_thumbnail($post_id) && isset($gallery_ids[0])) {
                set_post_thumbnail($post_id, $gallery_ids[0]);
            }
        }
    }

    private static function find_attachment_by_source_url(string $url): int {
        $query = new \WP_Query([
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'posts_per_page' => 1,
            'fields' => 'ids',
            'meta_key' => '_savol_source_url',
            'meta_value' => $url,
        ]);
        if (!empty($query->posts)) {
            return (int) $query->posts[0];
        }
        return 0;
    }

    public static function get_photo_import_timeout(): int {
        return self::PHOTO_IMPORT_TIMEOUT;
    }

    private static function update_progress(array $progress): void {
        update_option(self::AUTOSYNC_PROGRESS_OPTION, $progress, false);
    }

    private static function set_term_if_value(int $post_id, string $taxonomy, string $value): void {
        $value = trim($value);
        if ($value === '') {
            return;
        }
        wp_set_object_terms($post_id, [$value], $taxonomy, false);
    }

    private static function assign_unidade_term_with_contacts(int $post_id, string $entity_name): void {
        $entity_name = trim($entity_name);
        if ($entity_name === '') {
            return;
        }

        wp_set_object_terms($post_id, [$entity_name], 'veiculo_unidade', false);
        $term = get_term_by('name', $entity_name, 'veiculo_unidade');
        if (!$term || is_wp_error($term)) {
            return;
        }

        $contacts = self::find_unidade_contacts($entity_name);
        if (empty($contacts)) {
            return;
        }

        if (!empty($contacts['telefone'])) {
            update_term_meta((int) $term->term_id, 'veiculo_unidade_telefone', $contacts['telefone']);
        }
        if (!empty($contacts['whatsapp'])) {
            update_term_meta((int) $term->term_id, 'veiculo_unidade_whatsapp', $contacts['whatsapp']);
        }
        if (!empty($contacts['email'])) {
            update_term_meta((int) $term->term_id, 'veiculo_unidade_email', $contacts['email']);
        }
        if (!empty($contacts['endereco'])) {
            update_term_meta((int) $term->term_id, 'veiculo_unidade_endereco', $contacts['endereco']);
        }
    }

    private static function find_unidade_contacts(string $name): array {
        $normalized_name = self::normalize_text($name);
        $canonical_name = self::canonicalize_text($name);
        $candidates = array_values(array_unique([
            $normalized_name,
            'unidade ' . $normalized_name,
            $canonical_name,
            self::canonicalize_text('unidade ' . $name),
        ]));

        foreach (self::UNIDADE_CONTACTS as $key => $contacts) {
            $key_canonical = self::canonicalize_text($key);
            foreach ($candidates as $candidate) {
                if ($candidate === $key || $candidate === $key_canonical) {
                    return $contacts;
                }
                if (str_contains($key, $candidate) || str_contains($candidate, $key)) {
                    return $contacts;
                }
                if (str_contains($key_canonical, $candidate) || str_contains($candidate, $key_canonical)) {
                    return $contacts;
                }
            }
        }

        return [];
    }

    private static function normalize_text(string $value): string {
        $value = strtolower($value);
        if (function_exists('remove_accents')) {
            $value = remove_accents($value);
        }
        $value = preg_replace('/\s+/', ' ', $value);
        return trim((string) $value);
    }

    private static function canonicalize_text(string $value): string {
        $value = self::normalize_text($value);
        $value = preg_replace('/[^a-z0-9]+/', ' ', $value);
        $value = preg_replace('/\s+/', ' ', (string) $value);
        return trim((string) $value);
    }

    private static function get_autosync_endpoint(): string {
        $stored = (string) get_option(self::AUTOSYNC_ENDPOINT_OPTION, '');
        if ($stored !== '') {
            return untrailingslashit($stored);
        }
        return untrailingslashit(self::AUTOSYNC_ENDPOINT_DEFAULT);
    }

    private static function get_autosync_endpoint_candidates(): array {
        $base = self::get_autosync_endpoint();
        $is_custom = (string) get_option(self::AUTOSYNC_ENDPOINT_OPTION, '') !== '';
        if ($is_custom) {
            return array_values(array_unique([
                esc_url_raw(untrailingslashit($base)),
                esc_url_raw(trailingslashit($base)),
            ]));
        }

        $parsed = wp_parse_url($base);
        $host_root = '';
        if (is_array($parsed) && isset($parsed['scheme'], $parsed['host'])) {
            $host_root = $parsed['scheme'] . '://' . $parsed['host'];
        }

        $candidates = [
            $base,
            trailingslashit($base),
        ];

        if ($host_root !== '') {
            $candidates[] = $host_root . '/vehicle/stock';
            $candidates[] = $host_root . '/vehicle/stocks';
            $candidates[] = $host_root . '/vehicles/stock';
            $candidates[] = $host_root . '/vehicles/stocks';
            $candidates[] = $host_root . '/stock';
            $candidates[] = $host_root . '/api/vehicle/stock';
            $candidates[] = $host_root . '/api/vehicles/stock';
        }

        $clean = [];
        foreach ($candidates as $url) {
            $url = trim((string) $url);
            if ($url === '') {
                continue;
            }
            $clean[] = esc_url_raw($url);
        }

        return array_values(array_unique($clean));
    }

    private static function mask_sensitive(string $text): string {
        if ($text === '') {
            return '';
        }
        $text = preg_replace('/([?&](?:token|access_token)=)[^&]+/i', '$1***', $text);
        return (string) $text;
    }

    private static function extract_city(string $entity_name): string {
        $parts = array_map('trim', explode('-', $entity_name));
        $last = end($parts);
        return is_string($last) ? $last : '';
    }

    private static function encrypt_token(string $plain): string {
        if (!function_exists('openssl_encrypt')) {
            return base64_encode($plain);
        }
        $key = hash('sha256', wp_salt('auth'), true);
        $iv = random_bytes(16);
        $cipher = openssl_encrypt($plain, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($cipher === false) {
            return base64_encode($plain);
        }
        return base64_encode($iv . $cipher);
    }

    private static function decrypt_token(string $encoded): string {
        if ($encoded === '') {
            return '';
        }
        $raw = base64_decode($encoded, true);
        if ($raw === false) {
            return '';
        }
        if (!function_exists('openssl_decrypt') || strlen($raw) < 17) {
            return $raw;
        }
        $key = hash('sha256', wp_salt('auth'), true);
        $iv = substr($raw, 0, 16);
        $cipher = substr($raw, 16);
        $plain = openssl_decrypt($cipher, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($plain !== false) {
            return $plain;
        }
        return $raw;
    }
    public static function render_cor_add_fields(): void {
        ?>
        <div class="form-field term-group">
            <label for="veiculo_cor_hex">Cor (hex)</label>
            <input type="text" id="veiculo_cor_hex" name="veiculo_cor_hex" value="#000000" class="savol-color-field" />
        </div>
        <?php
    }

    public static function render_cor_edit_fields(\WP_Term $term): void {
        $hex = (string) get_term_meta($term->term_id, 'veiculo_cor_hex', true);
        if ($hex === '') {
            $hex = '#000000';
        }
        ?>
        <tr class="form-field term-group-wrap">
            <th scope="row"><label for="veiculo_cor_hex">Cor (hex)</label></th>
            <td><input type="text" id="veiculo_cor_hex" name="veiculo_cor_hex" value="<?php echo esc_attr($hex); ?>" class="savol-color-field" /></td>
        </tr>
        <?php
    }

    public static function save_cor_term_meta(int $term_id): void {
        if (!current_user_can('manage_categories') || !isset($_POST['veiculo_cor_hex'])) {
            return;
        }

        $hex = sanitize_hex_color((string) wp_unslash($_POST['veiculo_cor_hex']));
        if (!$hex) {
            $hex = '#000000';
        }
        update_term_meta($term_id, 'veiculo_cor_hex', $hex);
    }

    public static function render_marca_add_fields(): void {
        ?>
        <div class="form-field term-group">
            <label for="veiculo_marca_logo_id">Logo da marca (PNG/WebP)</label>
            <input type="hidden" id="veiculo_marca_logo_id" name="veiculo_marca_logo_id" class="savol-marca-logo-id" value="" />
            <p>
                <button type="button" class="button savol-marca-logo-upload">Selecionar logo</button>
                <button type="button" class="button savol-marca-logo-remove">Remover</button>
            </p>
            <img class="savol-term-logo-preview" src="" alt="" style="display:none;" />
        </div>
        <?php
    }

    public static function render_marca_edit_fields(\WP_Term $term): void {
        $logo_id = (int) get_term_meta($term->term_id, 'veiculo_marca_logo_id', true);
        $logo_url = $logo_id > 0 ? wp_get_attachment_image_url($logo_id, 'thumbnail') : '';
        ?>
        <tr class="form-field term-group-wrap">
            <th scope="row"><label for="veiculo_marca_logo_id">Logo da marca (PNG/WebP)</label></th>
            <td>
                <input type="hidden" id="veiculo_marca_logo_id" name="veiculo_marca_logo_id" class="savol-marca-logo-id" value="<?php echo esc_attr((string) $logo_id); ?>" />
                <p>
                    <button type="button" class="button savol-marca-logo-upload">Selecionar logo</button>
                    <button type="button" class="button savol-marca-logo-remove">Remover</button>
                </p>
                <img class="savol-term-logo-preview" src="<?php echo esc_url((string) $logo_url); ?>" alt=""<?php echo $logo_url === '' ? ' style="display:none;"' : ''; ?> />
            </td>
        </tr>
        <?php
    }

    public static function save_marca_term_meta(int $term_id): void {
        if (!current_user_can('manage_categories')) {
            return;
        }

        $logo_id = isset($_POST['veiculo_marca_logo_id']) ? (int) wp_unslash($_POST['veiculo_marca_logo_id']) : 0;
        if ($logo_id <= 0) {
            delete_term_meta($term_id, 'veiculo_marca_logo_id');
            return;
        }

        $file = get_attached_file($logo_id);
        if (!$file) {
            return;
        }

        $file_type = wp_check_filetype($file);
        if (!in_array($file_type['type'], ['image/png', 'image/webp'], true)) {
            return;
        }

        update_term_meta($term_id, 'veiculo_marca_logo_id', $logo_id);
    }

    public static function render_unidade_add_fields(): void {
        ?>
        <div class="form-field term-group">
            <label for="veiculo_unidade_telefone">Telefone</label>
            <input type="text" id="veiculo_unidade_telefone" name="veiculo_unidade_telefone" value="" />
        </div>
        <div class="form-field term-group">
            <label for="veiculo_unidade_whatsapp">WhatsApp</label>
            <input type="text" id="veiculo_unidade_whatsapp" name="veiculo_unidade_whatsapp" value="" />
        </div>
        <div class="form-field term-group">
            <label for="veiculo_unidade_email">E-mail</label>
            <input type="email" id="veiculo_unidade_email" name="veiculo_unidade_email" value="" />
        </div>
        <div class="form-field term-group">
            <label for="veiculo_unidade_endereco">Endereco</label>
            <textarea id="veiculo_unidade_endereco" name="veiculo_unidade_endereco" rows="4"></textarea>
        </div>
        <?php
    }

    public static function render_unidade_edit_fields(\WP_Term $term): void {
        $telefone = (string) get_term_meta($term->term_id, 'veiculo_unidade_telefone', true);
        $whatsapp = (string) get_term_meta($term->term_id, 'veiculo_unidade_whatsapp', true);
        $email = (string) get_term_meta($term->term_id, 'veiculo_unidade_email', true);
        $endereco = (string) get_term_meta($term->term_id, 'veiculo_unidade_endereco', true);
        ?>
        <tr class="form-field term-group-wrap">
            <th scope="row"><label for="veiculo_unidade_telefone">Telefone</label></th>
            <td><input type="text" id="veiculo_unidade_telefone" name="veiculo_unidade_telefone" value="<?php echo esc_attr($telefone); ?>" /></td>
        </tr>
        <tr class="form-field term-group-wrap">
            <th scope="row"><label for="veiculo_unidade_whatsapp">WhatsApp</label></th>
            <td><input type="text" id="veiculo_unidade_whatsapp" name="veiculo_unidade_whatsapp" value="<?php echo esc_attr($whatsapp); ?>" /></td>
        </tr>
        <tr class="form-field term-group-wrap">
            <th scope="row"><label for="veiculo_unidade_email">E-mail</label></th>
            <td><input type="email" id="veiculo_unidade_email" name="veiculo_unidade_email" value="<?php echo esc_attr($email); ?>" /></td>
        </tr>
        <tr class="form-field term-group-wrap">
            <th scope="row"><label for="veiculo_unidade_endereco">Endereco</label></th>
            <td><textarea id="veiculo_unidade_endereco" name="veiculo_unidade_endereco" rows="4"><?php echo esc_textarea($endereco); ?></textarea></td>
        </tr>
        <?php
    }

    public static function save_unidade_term_meta(int $term_id): void {
        if (!current_user_can('manage_categories')) {
            return;
        }
        if (isset($_POST['veiculo_unidade_telefone'])) {
            update_term_meta($term_id, 'veiculo_unidade_telefone', sanitize_text_field((string) wp_unslash($_POST['veiculo_unidade_telefone'])));
        }
        if (isset($_POST['veiculo_unidade_whatsapp'])) {
            update_term_meta($term_id, 'veiculo_unidade_whatsapp', sanitize_text_field((string) wp_unslash($_POST['veiculo_unidade_whatsapp'])));
        }
        if (isset($_POST['veiculo_unidade_email'])) {
            update_term_meta($term_id, 'veiculo_unidade_email', sanitize_email((string) wp_unslash($_POST['veiculo_unidade_email'])));
        }
        if (isset($_POST['veiculo_unidade_endereco'])) {
            update_term_meta($term_id, 'veiculo_unidade_endereco', sanitize_textarea_field((string) wp_unslash($_POST['veiculo_unidade_endereco'])));
        }
    }
}


