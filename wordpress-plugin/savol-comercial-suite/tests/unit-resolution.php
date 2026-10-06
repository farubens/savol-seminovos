<?php
define('ABSPATH', __DIR__);

function remove_accents(string $value): string {
    return strtr($value, [
        'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A',
        'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
        'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
        'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
        'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U', 'Ç' => 'C',
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c',
    ]);
}

require dirname(__DIR__) . '/modules/vehicles/class-savol-veiculos-cpt.php';

$reflection = new ReflectionClass('Savol_Veiculos_CPT');
$resolve = $reflection->getMethod('resolve_known_unidade_name');
$contacts = $reflection->getMethod('find_unidade_contacts');
$city = $reflection->getMethod('extract_city_from_unidade');

$cases = [
    'PEUGEOT/CITROEN SANTO ANDRE' => ['Unidade SAVOL Peugeot Santo André', 'Santo André'],
    'PEUGEOT/CITROEN SAO CAETANO' => ['Unidade SAVOL Peugeot São Caetano do Sul', 'São Caetano do Sul'],
    'PEUGEOT/CITROEN SBC' => ['Unidade SAVOL Peugeot São Bernardo do Campo', 'São Bernardo do Campo'],
    'SAVOL FIAT SANTO ANDRE' => ['Unidade SAVOL Fiat Santo André', 'Santo André'],
    'SAVOL FIAT SBC' => ['Unidade SAVOL Fiat São Bernardo do Campo', 'São Bernardo do Campo'],
    'SAVOL FIAT SCS' => ['Unidade SAVOL Fiat São Caetano do Sul', 'São Caetano do Sul'],
    'SAVOL JETOUR DOM PEDRO' => ['Unidade SAVOL JETOUR Santo André', 'Santo André'],
    'SAVOL KIA SANTO ANDRE' => ['Unidade SAVOL Kia Santo André', 'Santo André'],
    'SAVOL MG SÃO CAETANO' => ['Unidade SAVOL MG Motor São Caetano', 'São Caetano do Sul'],
    'SAVOL TOYOTA DOM PEDRO' => ['Unidade SAVOL Toyota Dom Pedro II', 'Santo André'],
    'SAVOL TOYOTA MAUA' => ['Unidade SAVOL Toyota Mauá', 'Mauá'],
    'SAVOL TOYOTA PRAIA GRANDE' => ['Unidade SAVOL Toyota Praia Grande', 'Praia Grande'],
    'SAVOL TOYOTA SANTO ANDRE' => ['Unidade SAVOL Toyota Santo André', 'Santo André'],
    'SAVOL TOYOTA SBC' => ['Unidade SAVOL Toyota São Bernardo do Campo', 'São Bernardo do Campo'],
    'SAVOL VOLKS SANTO ANDRE' => ['Unidade SAVOL Volkswagen Santo André', 'Santo André'],
];

foreach ($cases as $input => [$expected_name, $expected_city]) {
    $resolved_name = $resolve->invoke(null, $input);
    if ($resolved_name !== $expected_name) {
        throw new RuntimeException("Nome incorreto para {$input}: {$resolved_name}");
    }

    $resolved_city = $city->invoke(null, $resolved_name);
    if ($resolved_city !== $expected_city) {
        throw new RuntimeException("Cidade incorreta para {$input}: {$resolved_city}");
    }

    $resolved_contacts = $contacts->invoke(null, $input);
    if (empty($resolved_contacts['endereco'])) {
        throw new RuntimeException("Endereco nao encontrado para {$input}");
    }
}

echo "OK: unidades, cidades e enderecos resolvidos corretamente.\n";
