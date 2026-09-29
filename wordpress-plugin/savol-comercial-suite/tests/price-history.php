<?php
define('ABSPATH', __DIR__);

class WP_User {
    public int $ID = 7;
    public string $display_name = 'Gestor';
}

$meta = [42 => ['preco' => [100000.0]]];

function get_post_type(int $post_id): string { return $post_id === 42 ? 'veiculo' : 'post'; }
function get_post_meta(int $post_id, string $key, bool $single = true) {
    global $meta;
    $values = $meta[$post_id][$key] ?? [];
    return $single ? ($values[0] ?? '') : $values;
}
function add_post_meta(int $post_id, string $key, $value): int {
    global $meta;
    $meta[$post_id][$key][] = $value;
    return count($meta[$post_id][$key]);
}
function wp_get_current_user(): WP_User { return new WP_User(); }
function get_current_user_id(): int { return 7; }

require dirname(__DIR__) . '/modules/vehicles/class-savol-veiculos-cpt.php';

function assert_history_count(int $expected): void {
    $actual = count(get_post_meta(42, '_savol_preco_historico', false));
    if ($actual !== $expected) throw new RuntimeException("Expected $expected events; got $actual");
}

Savol_Veiculos_CPT::capture_price_before_update(null, 42, 'preco', 110000, '');
$meta[42]['preco'] = [110000.0];
Savol_Veiculos_CPT::record_price_meta_change(1, 42, 'preco', 110000);
assert_history_count(2);

Savol_Veiculos_CPT::capture_price_before_update(null, 42, 'preco', 110000, '');
Savol_Veiculos_CPT::record_price_meta_change(1, 42, 'preco', 110000);
assert_history_count(2);

Savol_Veiculos_CPT::capture_price_before_update(null, 42, 'preco', 95000, '');
$meta[42]['preco'] = [95000.0];
Savol_Veiculos_CPT::record_price_meta_change(1, 42, 'preco', 95000);
assert_history_count(3);

Savol_Veiculos_CPT::capture_price_before_delete(null, 42, 'preco', '', false);
unset($meta[42]['preco']);
Savol_Veiculos_CPT::record_price_meta_change(1, 42, 'preco', '');
assert_history_count(4);

$history = get_post_meta(42, '_savol_preco_historico', false);
if (
    $history[0]['kind'] !== 'baseline' || $history[0]['price'] !== 100000.0 ||
    $history[1]['previousPrice'] !== 100000.0 || $history[1]['price'] !== 110000.0 ||
    $history[2]['previousPrice'] !== 110000.0 || $history[2]['price'] !== 95000.0 ||
    $history[3]['previousPrice'] !== 95000.0 || $history[3]['price'] !== null
) {
    throw new RuntimeException('Price event sequence is incorrect');
}

echo "Price history test passed\n";
