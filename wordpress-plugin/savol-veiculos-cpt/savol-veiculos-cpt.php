<?php
/**
 * Plugin Name: Savol Veiculos CPT
 * Description: Cria o post type de veiculos com metacampos e taxonomias para carros.
 * Version: 1.2.24
 * Author: Unti Digital
 * Author URI: https://untidigital.com.br
 * License: GPL2+
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Savol_Veiculos_CPT')) {
    require_once plugin_dir_path(__FILE__) . 'includes/class-savol-veiculos-cpt.php';
}

if (class_exists('Savol_Veiculos_CPT')) {
    Savol_Veiculos_CPT::init();
    register_activation_hook(__FILE__, ['Savol_Veiculos_CPT', 'activate']);
    register_deactivation_hook(__FILE__, ['Savol_Veiculos_CPT', 'deactivate']);
}







