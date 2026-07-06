<?php
/**
 * Plugin Name: Savol Comercial Suite
 * Description: Plugin all-in-one Savol para veiculos, painel comercial, Venda Seu Carro, financiamento e conta de clientes.
 * Version: 1.0.6
 * Author: Savol
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('SAVOL_COMERCIAL_SUITE_VERSION')) {
    define('SAVOL_COMERCIAL_SUITE_VERSION', '1.0.6');
}
if (!defined('SAVOL_COMERCIAL_SUITE_FILE')) {
    define('SAVOL_COMERCIAL_SUITE_FILE', __FILE__);
}
if (!defined('SAVOL_COMERCIAL_SUITE_PATH')) {
    define('SAVOL_COMERCIAL_SUITE_PATH', plugin_dir_path(__FILE__));
}

if (!function_exists('savol_comercial_suite_legacy_plugins')) :

function savol_comercial_suite_legacy_plugins(): array
{
    return [
        'savol-financing-leads/savol-financing-leads.php',
        'savol-painel-comercial/savol-painel-comercial.php',
        'savol-seminovos-account/savol-seminovos-account.php',
        'savol-seminovos-account-atual/savol-seminovos-account.php',
        'savol-veiculos-cpt/savol-veiculos-cpt.php',
        'savol-gestor-admin/savol-gestor-admin.php',
    ];
}

function savol_comercial_suite_plugin_file(): string
{
    return plugin_basename(SAVOL_COMERCIAL_SUITE_FILE);
}

function savol_comercial_suite_active_legacy_plugins(): array
{
    $active = (array) get_option('active_plugins', []);
    if (is_multisite()) {
        $active = array_merge($active, array_keys((array) get_site_option('active_sitewide_plugins', [])));
    }

    $self = savol_comercial_suite_plugin_file();
    return array_values(array_filter(savol_comercial_suite_legacy_plugins(), static function (string $plugin) use ($active, $self): bool {
        return $plugin !== $self && in_array($plugin, $active, true);
    }));
}

function savol_comercial_suite_deactivate_legacy_plugins(): void
{
    $legacy = savol_comercial_suite_active_legacy_plugins();
    if (empty($legacy)) {
        return;
    }

    require_once ABSPATH . 'wp-admin/includes/plugin.php';
    deactivate_plugins($legacy, true, is_multisite());
    update_option('savol_comercial_suite_deactivated_legacy', $legacy, false);
}

function savol_comercial_suite_activation(): void
{
    savol_comercial_suite_deactivate_legacy_plugins();
    update_option('savol_comercial_suite_version', SAVOL_COMERCIAL_SUITE_VERSION, false);
}

function savol_comercial_suite_deactivation(): void
{
    if (class_exists('Savol_Veiculos_CPT')) {
        Savol_Veiculos_CPT::deactivate();
    }
    flush_rewrite_rules();
}

register_activation_hook(__FILE__, 'savol_comercial_suite_activation');
register_deactivation_hook(__FILE__, 'savol_comercial_suite_deactivation');

function savol_comercial_suite_admin_notice(): void
{
    $legacy = get_option('savol_comercial_suite_deactivated_legacy', []);
    if (is_array($legacy) && !empty($legacy)) {
        delete_option('savol_comercial_suite_deactivated_legacy');
        echo '<div class="notice notice-success is-dismissible"><p><strong>Savol Comercial Suite:</strong> plugins antigos desativados automaticamente: ' . esc_html(implode(', ', $legacy)) . '. As chaves, tokens, dados e metadados foram preservados.</p></div>';
        return;
    }

    $active_legacy = savol_comercial_suite_active_legacy_plugins();
    if (!empty($active_legacy)) {
        echo '<div class="notice notice-error"><p><strong>Savol Comercial Suite:</strong> desative os plugins Savol antigos para evitar duplicidade: ' . esc_html(implode(', ', $active_legacy)) . '.</p></div>';
    }
}

add_action('admin_notices', 'savol_comercial_suite_admin_notice');

function savol_comercial_suite_can_boot(): bool
{
    return empty(savol_comercial_suite_active_legacy_plugins());
}

function savol_comercial_suite_load_modules(): void
{
    if (!savol_comercial_suite_can_boot()) {
        return;
    }

    require_once SAVOL_COMERCIAL_SUITE_PATH . 'modules/vehicles/class-savol-veiculos-cpt.php';
    if (!function_exists('savol_financing_activate')) {
        require_once SAVOL_COMERCIAL_SUITE_PATH . 'modules/financing/financing-leads.php';
    }
    if (!function_exists('savol_account_json_error')) {
        require_once SAVOL_COMERCIAL_SUITE_PATH . 'modules/account/account-api.php';
    }
    require_once SAVOL_COMERCIAL_SUITE_PATH . 'modules/panel/class-savol-painel-comercial.php';

    if (class_exists('Savol_Veiculos_CPT')) {
        Savol_Veiculos_CPT::init();
    }

    if (class_exists('Savol_Painel_Comercial')) {
        Savol_Painel_Comercial::init();
    }
}

function savol_comercial_suite_bootstrap(): void
{
    if (!savol_comercial_suite_can_boot()) {
        return;
    }

    $current = (string) get_option('savol_comercial_suite_bootstrapped_version', '');
    if ($current === SAVOL_COMERCIAL_SUITE_VERSION) {
        return;
    }

    if (class_exists('Savol_Veiculos_CPT')) {
        Savol_Veiculos_CPT::activate();
    }

    if (class_exists('Savol_Painel_Comercial')) {
        Savol_Painel_Comercial::activate();
    }

    if (function_exists('savol_financing_activate')) {
        savol_financing_activate();
    }

    update_option('savol_comercial_suite_bootstrapped_version', SAVOL_COMERCIAL_SUITE_VERSION, false);
    flush_rewrite_rules();
}

savol_comercial_suite_load_modules();
add_action('init', 'savol_comercial_suite_bootstrap', 99);

endif;
