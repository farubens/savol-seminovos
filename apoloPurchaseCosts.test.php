<?php
define('ABSPATH', __DIR__ . '/');
function remove_accents($value) { return $value; }
require __DIR__ . '/wordpress-plugin/savol-comercial-suite/modules/vehicles/class-savol-veiculos-cpt.php';

$method = new ReflectionMethod('Savol_Veiculos_CPT', 'build_apolo_stock_index');
$common = ['placa' => 'FLF4184', 'empresa' => 1, 'revenda_origem' => 1, 'repasse' => false, 'dias_estoque' => 0, 'dias_proposta' => 0];
foreach ([
    ['valor_compra' => 21595],
    ['val_compra' => 21595],
    ['valor_compra' => '21.595,00'],
    ['valor_compra' => 21595, 'val_compra' => 99999],
] as $fields) {
    $index = $method->invoke(null, [array_merge($common, $fields)]);
    if ($index['plate:FLF4184']['val_compra'] !== 21595.0) {
        throw new RuntimeException('Incorrect purchase cost mapping');
    }
}
echo "PASS: current and legacy Apolo purchase cost fields\n";
