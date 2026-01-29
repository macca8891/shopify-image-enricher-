const { COUNTRY_MAPPING } = require('./utils/countryMapping');

// Your list of countries
const YOUR_COUNTRIES = `
Every Country/Region
Australia
Austria
Belgium
Canada
Czechia
Denmark
Finland
France
Germany
Ireland
Israel
Italy
Japan
Malaysia
Netherlands
New Zealand
Norway
Poland
Portugal
Singapore
South Korea
Spain
Sweden
Switzerland
United Arab Emirates
United Kingdom
United States
Algeria
Angola
Ascension Island
Benin
Botswana
British Indian Ocean Territory
Burkina Faso
Burundi
Cameroon
Cape Verde
Central African Republic
Chad
Comoros
Congo - Brazzaville
Congo - Kinshasa
Côte d'Ivoire
Djibouti
Egypt
Equatorial Guinea
Eritrea
Eswatini
Ethiopia
French Southern Territories
Gabon
Gambia
Ghana
Guinea
Guinea-Bissau
Kenya
Lesotho
Liberia
Libya
Madagascar
Malawi
Mali
Mauritania
Mauritius
Mayotte
Morocco
Mozambique
Namibia
Niger
Nigeria
Réunion
Rwanda
São Tomé & Príncipe
Senegal
Seychelles
Sierra Leone
Somalia
South Africa
South Sudan
St. Helena
Sudan
Tanzania
Togo
Tristan da Cunha
Tunisia
Uganda
Western Sahara
Zambia
Zimbabwe
Afghanistan
Armenia
Azerbaijan
Bahrain
Bangladesh
Bhutan
Brunei
Cambodia
Cyprus
Georgia
India
Indonesia
Iraq
Jordan
Kazakhstan
Kuwait
Kyrgyzstan
Laos
Lebanon
Macao
Maldives
Mongolia
Myanmar (Burma)
Nepal
Oman
Pakistan
Palestine
Philippines
Qatar
Saudi Arabia
Sri Lanka
Tajikistan
Thailand
Timor-Leste
Türkiye
Turkmenistan
Uzbekistan
Vietnam
Yemen
Åland Islands
Albania
Andorra
Belarus
Bosnia & Herzegovina
Bulgaria
Croatia
Estonia
Faroe Islands
Gibraltar
Greece
Guernsey
Hungary
Iceland
Isle of Man
Jersey
Kosovo
Latvia
Liechtenstein
Lithuania
Luxembourg
Malta
Moldova
Monaco
Montenegro
North Macedonia
Romania
Russia
San Marino
Serbia
Slovakia
Slovenia
Svalbard & Jan Mayen
Ukraine
Vatican City
Anguilla
Antigua & Barbuda
Aruba
Bahamas
Barbados
Belize
Bermuda
British Virgin Islands
Caribbean Netherlands
Cayman Islands
Costa Rica
Curaçao
Dominica
Dominican Republic
El Salvador
Greenland
Grenada
Guadeloupe
Guatemala
Haiti
Honduras
Jamaica
Martinique
Mexico
Montserrat
Nicaragua
Panama
Sint Maarten
St. Barthélemy
St. Kitts & Nevis
St. Lucia
St. Martin
St. Pierre & Miquelon
St. Vincent & Grenadines
Trinidad & Tobago
Turks & Caicos Islands
Christmas Island
Cocos (Keeling) Islands
Cook Islands
Fiji
French Polynesia
Kiribati
Nauru
New Caledonia
Niue
Norfolk Island
Papua New Guinea
Pitcairn Islands
Samoa
Solomon Islands
Tokelau
Tonga
Tuvalu
U.S. Outlying Islands
Vanuatu
Wallis & Futuna
Argentina
Bolivia
Brazil
Chile
Colombia
Ecuador
Falkland Islands (Islas Malvinas)
French Guiana
Guyana
Paraguay
Peru
South Georgia & South Sandwich Islands
Suriname
Uruguay
Venezuela
`.trim().split('\n').filter(c => c && c !== 'Every Country/Region');

// Mapping variations
const NAME_VARIATIONS = {
    'Czechia': 'Czech Republic',
    'South Korea': 'South Korea',
    'United Kingdom': 'United Kingdom',
    'United States': 'United States',
    'United Arab Emirates': 'United Arab Emirates',
    'Congo - Brazzaville': 'Congo',
    'Congo - Kinshasa': 'Congo (DRC)',
    'Côte d\'Ivoire': 'Côte d\'Ivoire',
    'Eswatini': 'Eswatini', // Eswatini is the new name (SZ)
    'São Tomé & Príncipe': 'São Tomé and Príncipe',
    'St. Helena': 'Saint Helena',
    'Ascension Island': 'Saint Helena', // Part of SH
    'Tristan da Cunha': 'Saint Helena', // Part of SH
    'Myanmar (Burma)': 'Myanmar',
    'Timor-Leste': 'Timor-Leste',
    'Türkiye': 'Turkey',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
    'North Macedonia': 'North Macedonia',
    'Svalbard & Jan Mayen': 'Svalbard and Jan Mayen',
    'St. Barthélemy': 'Saint Barthélemy',
    'St. Kitts & Nevis': 'Saint Kitts and Nevis',
    'St. Lucia': 'Saint Lucia',
    'St. Martin': 'Saint Martin',
    'St. Pierre & Miquelon': 'Saint Pierre and Miquelon',
    'St. Vincent & Grenadines': 'Saint Vincent and the Grenadines',
    'Trinidad & Tobago': 'Trinidad and Tobago',
    'Antigua & Barbuda': 'Antigua and Barbuda',
    'Turks & Caicos Islands': 'Turks and Caicos Islands',
    'Wallis & Futuna': 'Wallis and Futuna',
    'Cocos (Keeling) Islands': 'Cocos Islands',
    'Falkland Islands (Islas Malvinas)': 'Falkland Islands',
    'South Georgia & South Sandwich Islands': 'South Georgia and the South Sandwich Islands',
    'Macao': 'Macao',
    'Palestine': 'Palestine',
    'U.S. Outlying Islands': 'U.S. Outlying Islands',
    'Kosovo': null // Not in ISO mapping, skip
};

// Create reverse mapping: name -> code
const nameToCode = {};
for (const [code, info] of Object.entries(COUNTRY_MAPPING)) {
    if (info && info.name) {
        nameToCode[info.name.toLowerCase()] = code;
    }
}

// Map your countries to codes
const countryCodes = [];
const notFound = [];

for (const countryName of YOUR_COUNTRIES) {
    const normalized = countryName.trim();
    if (!normalized) continue;
    
    // Try direct match
    let code = nameToCode[normalized.toLowerCase()];
    
    // Try variations
    if (!code && NAME_VARIATIONS[normalized]) {
        if (NAME_VARIATIONS[normalized] === null) {
            // Skip this country (e.g., Kosovo)
            continue;
        }
        code = nameToCode[NAME_VARIATIONS[normalized].toLowerCase()];
    }
    
    // Try partial matches
    if (!code) {
        for (const [name, codeValue] of Object.entries(nameToCode)) {
            if (name.includes(normalized.toLowerCase()) || normalized.toLowerCase().includes(name)) {
                code = codeValue;
                break;
            }
        }
    }
    
    if (code) {
        countryCodes.push(code);
    } else {
        notFound.push(normalized);
    }
}

console.log(`Found ${countryCodes.length} countries`);
console.log(`Not found: ${notFound.length}`);
if (notFound.length > 0) {
    console.log('\nNot found countries:');
    notFound.forEach(c => console.log(`  - ${c}`));
}

console.log('\nCountry codes:');
console.log(JSON.stringify([...new Set(countryCodes)].sort(), null, 2));

