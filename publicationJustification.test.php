<?php
define('ABSPATH', __DIR__ . '/');
$metadata = [];
function absint($value) { return abs((int) $value); }
function get_post_meta($id, $key, $single = true) { global $metadata; return $metadata[$key] ?? ''; }
function sanitize_text_field($value) { return trim(strip_tags($value)); }
function sanitize_textarea_field($value) { return trim(strip_tags($value)); }
function wp_unslash($value) { return $value; }
function get_current_user_id() { return 1; }
function set_transient($key, $value, $ttl) {}
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_textarea($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function selected($value, $option, $echo = true) { return $value === $option ? ' selected' : ''; }
class WP_Post { public $ID = 1; public $post_type = 'veiculo'; }
require __DIR__ . '/wordpress-plugin/savol-comercial-suite/modules/vehicles/class-savol-veiculos-cpt.php';

$class = new ReflectionClass('Savol_Veiculos_CPT');
$metadata['apolo_reconciliacao_motivo'] = $class->getConstant('PRICE_OVERRIDE_REASON');
if (($argv[1] ?? '') === '--render') {
    Savol_Veiculos_CPT::render_price_override_meta_box(new WP_Post());
    exit;
}
$options = $class->getMethod('price_override_reason_options')->invoke(null);
$validate = $class->getMethod('valid_price_override_justification');
foreach ($options as $option) {
    if ($validate->invoke(null, $option, '') !== ($option !== 'OUTROS')) {
        throw new RuntimeException('Incorrect requirement for ' . $option);
    }
}
if (!in_array('TEST DRIVE', $options, true) || !in_array('OUTROS', $options, true)) {
    throw new RuntimeException('New reasons missing');
}
foreach (['', ' ', "\n\t", "\u{00a0}"] as $details) {
    if ($validate->invoke(null, 'OUTROS', $details)) throw new RuntimeException('Blank other justification accepted');
}
foreach ([['OUTROS', '', 'draft'], ['OUTROS', 'Aprovado pela diretoria', 'publish'], ['TEST DRIVE', '', 'publish'], [$options[0], '', 'publish']] as [$reason, $details, $expected]) {
    $_POST = ['publicacao_preco_justificativa_motivo' => $reason, 'publicacao_preco_justificativa_detalhes' => $details];
    $result = Savol_Veiculos_CPT::enforce_price_override_before_insert(['post_type' => 'veiculo', 'post_status' => 'publish'], ['ID' => 1]);
    if ($result['post_status'] !== $expected) throw new RuntimeException('Incorrect publish enforcement');
}
$metadata['publicacao_preco_justificativa_motivo'] = 'OUTROS';
$metadata['publicacao_preco_justificativa_detalhes'] = '';
if ($class->getMethod('has_price_override_justification')->invoke(null, 1)) throw new RuntimeException('Invalid stored authorization accepted');
$metadata['publicacao_preco_justificativa_detalhes'] = 'Aprovado';
if (!$class->getMethod('has_price_override_justification')->invoke(null, 1)) throw new RuntimeException('Valid stored authorization rejected');
echo "PASS: reasons, other details, publish enforcement and stored authorization\n";
