/**
 * Comprehensive country mapping for Shopify -> BuckyDrop
 * Maps ISO 3166-1 alpha-2 country codes to BuckyDrop-expected country names
 * 
 * Special cases:
 * - US -> "USA" (not "United States")
 * - Other countries use standard English country names
 */

const COUNTRY_MAPPING = {
    // A
    'AD': { code: 'AD', name: 'Andorra' },
    'AE': { code: 'AE', name: 'United Arab Emirates' },
    'AF': { code: 'AF', name: 'Afghanistan' },
    'AG': { code: 'AG', name: 'Antigua and Barbuda' },
    'AI': { code: 'AI', name: 'Anguilla' },
    'AL': { code: 'AL', name: 'Albania' },
    'AM': { code: 'AM', name: 'Armenia' },
    'AO': { code: 'AO', name: 'Angola' },
    'AQ': { code: 'AQ', name: 'Antarctica' },
    'AR': { code: 'AR', name: 'Argentina' },
    'AS': { code: 'AS', name: 'American Samoa' },
    'AT': { code: 'AT', name: 'Austria' },
    'AU': { code: 'AU', name: 'Australia' },
    'AW': { code: 'AW', name: 'Aruba' },
    'AX': { code: 'AX', name: 'Åland Islands' },
    'AZ': { code: 'AZ', name: 'Azerbaijan' },
    
    // B
    'BA': { code: 'BA', name: 'Bosnia and Herzegovina' },
    'BB': { code: 'BB', name: 'Barbados' },
    'BD': { code: 'BD', name: 'Bangladesh' },
    'BE': { code: 'BE', name: 'Belgium' },
    'BF': { code: 'BF', name: 'Burkina Faso' },
    'BG': { code: 'BG', name: 'Bulgaria' },
    'BH': { code: 'BH', name: 'Bahrain' },
    'BI': { code: 'BI', name: 'Burundi' },
    'BJ': { code: 'BJ', name: 'Benin' },
    'BL': { code: 'BL', name: 'Saint Barthélemy' },
    'BM': { code: 'BM', name: 'Bermuda' },
    'BN': { code: 'BN', name: 'Brunei' },
    'BO': { code: 'BO', name: 'Bolivia' },
    'BQ': { code: 'BQ', name: 'Caribbean Netherlands' },
    'BR': { code: 'BR', name: 'Brazil' },
    'BS': { code: 'BS', name: 'Bahamas' },
    'BT': { code: 'BT', name: 'Bhutan' },
    'BV': { code: 'BV', name: 'Bouvet Island' },
    'BW': { code: 'BW', name: 'Botswana' },
    'BY': { code: 'BY', name: 'Belarus' },
    'BZ': { code: 'BZ', name: 'Belize' },
    
    // C
    'CA': { code: 'CA', name: 'Canada' },
    'CC': { code: 'CC', name: 'Cocos Islands' },
    'CD': { code: 'CD', name: 'Congo (DRC)' },
    'CF': { code: 'CF', name: 'Central African Republic' },
    'CG': { code: 'CG', name: 'Congo' },
    'CH': { code: 'CH', name: 'Switzerland' },
    'CI': { code: 'CI', name: 'Côte d\'Ivoire' },
    'CK': { code: 'CK', name: 'Cook Islands' },
    'CL': { code: 'CL', name: 'Chile' },
    'CM': { code: 'CM', name: 'Cameroon' },
    'CN': { code: 'CN', name: 'China' }, // Excluded per user request
    'CO': { code: 'CO', name: 'Colombia' },
    'CR': { code: 'CR', name: 'Costa Rica' },
    'CU': { code: 'CU', name: 'Cuba' },
    'CV': { code: 'CV', name: 'Cape Verde' },
    'CW': { code: 'CW', name: 'Curaçao' },
    'CX': { code: 'CX', name: 'Christmas Island' },
    'CY': { code: 'CY', name: 'Cyprus' },
    'CZ': { code: 'CZ', name: 'Czech Republic' },
    
    // D
    'DE': { code: 'DE', name: 'Germany' },
    'DJ': { code: 'DJ', name: 'Djibouti' },
    'DK': { code: 'DK', name: 'Denmark' },
    'DM': { code: 'DM', name: 'Dominica' },
    'DO': { code: 'DO', name: 'Dominican Republic' },
    'DZ': { code: 'DZ', name: 'Algeria' },
    
    // E
    'EC': { code: 'EC', name: 'Ecuador' },
    'EE': { code: 'EE', name: 'Estonia' },
    'EG': { code: 'EG', name: 'Egypt' },
    'EH': { code: 'EH', name: 'Western Sahara' },
    'ER': { code: 'ER', name: 'Eritrea' },
    'ES': { code: 'ES', name: 'Spain' },
    'ET': { code: 'ET', name: 'Ethiopia' },
    
    // F
    'FI': { code: 'FI', name: 'Finland' },
    'FJ': { code: 'FJ', name: 'Fiji' },
    'FK': { code: 'FK', name: 'Falkland Islands' },
    'FM': { code: 'FM', name: 'Micronesia' },
    'FO': { code: 'FO', name: 'Faroe Islands' },
    'FR': { code: 'FR', name: 'France' },
    
    // G
    'GA': { code: 'GA', name: 'Gabon' },
    'GB': { code: 'GB', name: 'United Kingdom' },
    'GD': { code: 'GD', name: 'Grenada' },
    'GE': { code: 'GE', name: 'Georgia' },
    'GF': { code: 'GF', name: 'French Guiana' },
    'GG': { code: 'GG', name: 'Guernsey' },
    'GH': { code: 'GH', name: 'Ghana' },
    'GI': { code: 'GI', name: 'Gibraltar' },
    'GL': { code: 'GL', name: 'Greenland' },
    'GM': { code: 'GM', name: 'Gambia' },
    'GN': { code: 'GN', name: 'Guinea' },
    'GP': { code: 'GP', name: 'Guadeloupe' },
    'GQ': { code: 'GQ', name: 'Equatorial Guinea' },
    'GR': { code: 'GR', name: 'Greece' },
    'GS': { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
    'GT': { code: 'GT', name: 'Guatemala' },
    'GU': { code: 'GU', name: 'Guam' },
    'GW': { code: 'GW', name: 'Guinea-Bissau' },
    'GY': { code: 'GY', name: 'Guyana' },
    
    // H
    'HK': { code: 'HK', name: 'Hong Kong' }, // Excluded per user request
    'HM': { code: 'HM', name: 'Heard Island and McDonald Islands' },
    'HN': { code: 'HN', name: 'Honduras' },
    'HR': { code: 'HR', name: 'Croatia' },
    'HT': { code: 'HT', name: 'Haiti' },
    'HU': { code: 'HU', name: 'Hungary' },
    
    // I
    'ID': { code: 'ID', name: 'Indonesia' },
    'IE': { code: 'IE', name: 'Ireland' },
    'IL': { code: 'IL', name: 'Israel' },
    'IM': { code: 'IM', name: 'Isle of Man' },
    'IN': { code: 'IN', name: 'India' },
    'IO': { code: 'IO', name: 'British Indian Ocean Territory' },
    'IQ': { code: 'IQ', name: 'Iraq' },
    'IR': { code: 'IR', name: 'Iran' },
    'IS': { code: 'IS', name: 'Iceland' },
    'IT': { code: 'IT', name: 'Italy' },
    
    // J
    'JE': { code: 'JE', name: 'Jersey' },
    'JM': { code: 'JM', name: 'Jamaica' },
    'JO': { code: 'JO', name: 'Jordan' },
    'JP': { code: 'JP', name: 'Japan' },
    
    // K
    'KE': { code: 'KE', name: 'Kenya' },
    'KG': { code: 'KG', name: 'Kyrgyzstan' },
    'KH': { code: 'KH', name: 'Cambodia' },
    'KI': { code: 'KI', name: 'Kiribati' },
    'KM': { code: 'KM', name: 'Comoros' },
    'KN': { code: 'KN', name: 'Saint Kitts and Nevis' },
    'KP': { code: 'KP', name: 'North Korea' },
    'KR': { code: 'KR', name: 'South Korea' },
    'KW': { code: 'KW', name: 'Kuwait' },
    'KY': { code: 'KY', name: 'Cayman Islands' },
    'KZ': { code: 'KZ', name: 'Kazakhstan' },
    
    // L
    'LA': { code: 'LA', name: 'Laos' },
    'LB': { code: 'LB', name: 'Lebanon' },
    'LC': { code: 'LC', name: 'Saint Lucia' },
    'LI': { code: 'LI', name: 'Liechtenstein' },
    'LK': { code: 'LK', name: 'Sri Lanka' },
    'LR': { code: 'LR', name: 'Liberia' },
    'LS': { code: 'LS', name: 'Lesotho' },
    'LT': { code: 'LT', name: 'Lithuania' },
    'LU': { code: 'LU', name: 'Luxembourg' },
    'LV': { code: 'LV', name: 'Latvia' },
    'LY': { code: 'LY', name: 'Libya' },
    
    // M
    'MA': { code: 'MA', name: 'Morocco' },
    'MC': { code: 'MC', name: 'Monaco' },
    'MD': { code: 'MD', name: 'Moldova' },
    'ME': { code: 'ME', name: 'Montenegro' },
    'MF': { code: 'MF', name: 'Saint Martin' },
    'MG': { code: 'MG', name: 'Madagascar' },
    'MH': { code: 'MH', name: 'Marshall Islands' },
    'MK': { code: 'MK', name: 'North Macedonia' },
    'ML': { code: 'ML', name: 'Mali' },
    'MM': { code: 'MM', name: 'Myanmar' },
    'MN': { code: 'MN', name: 'Mongolia' },
    'MO': { code: 'MO', name: 'Macao' },
    'MP': { code: 'MP', name: 'Northern Mariana Islands' },
    'MQ': { code: 'MQ', name: 'Martinique' },
    'MR': { code: 'MR', name: 'Mauritania' },
    'MS': { code: 'MS', name: 'Montserrat' },
    'MT': { code: 'MT', name: 'Malta' },
    'MU': { code: 'MU', name: 'Mauritius' },
    'MV': { code: 'MV', name: 'Maldives' },
    'MW': { code: 'MW', name: 'Malawi' },
    'MX': { code: 'MX', name: 'Mexico' },
    'MY': { code: 'MY', name: 'Malaysia' },
    'MZ': { code: 'MZ', name: 'Mozambique' },
    
    // N
    'NA': { code: 'NA', name: 'Namibia' },
    'NC': { code: 'NC', name: 'New Caledonia' },
    'NE': { code: 'NE', name: 'Niger' },
    'NF': { code: 'NF', name: 'Norfolk Island' },
    'NG': { code: 'NG', name: 'Nigeria' },
    'NI': { code: 'NI', name: 'Nicaragua' },
    'NL': { code: 'NL', name: 'Netherlands' },
    'NO': { code: 'NO', name: 'Norway' },
    'NP': { code: 'NP', name: 'Nepal' },
    'NR': { code: 'NR', name: 'Nauru' },
    'NU': { code: 'NU', name: 'Niue' },
    'NZ': { code: 'NZ', name: 'New Zealand' },
    
    // O
    'OM': { code: 'OM', name: 'Oman' },
    
    // P
    'PA': { code: 'PA', name: 'Panama' },
    'PE': { code: 'PE', name: 'Peru' },
    'PF': { code: 'PF', name: 'French Polynesia' },
    'PG': { code: 'PG', name: 'Papua New Guinea' },
    'PH': { code: 'PH', name: 'Philippines' },
    'PK': { code: 'PK', name: 'Pakistan' },
    'PL': { code: 'PL', name: 'Poland' },
    'PM': { code: 'PM', name: 'Saint Pierre and Miquelon' },
    'PN': { code: 'PN', name: 'Pitcairn' },
    'PR': { code: 'PR', name: 'Puerto Rico' },
    'PS': { code: 'PS', name: 'Palestine' },
    'PT': { code: 'PT', name: 'Portugal' },
    'PW': { code: 'PW', name: 'Palau' },
    'PY': { code: 'PY', name: 'Paraguay' },
    
    // Q
    'QA': { code: 'QA', name: 'Qatar' },
    
    // R
    'RE': { code: 'RE', name: 'Réunion' },
    'RO': { code: 'RO', name: 'Romania' },
    'RS': { code: 'RS', name: 'Serbia' },
    'RU': { code: 'RU', name: 'Russia' },
    'RW': { code: 'RW', name: 'Rwanda' },
    
    // S
    'SA': { code: 'SA', name: 'Saudi Arabia' },
    'SB': { code: 'SB', name: 'Solomon Islands' },
    'SC': { code: 'SC', name: 'Seychelles' },
    'SD': { code: 'SD', name: 'Sudan' },
    'SE': { code: 'SE', name: 'Sweden' },
    'SG': { code: 'SG', name: 'Singapore' },
    'SH': { code: 'SH', name: 'Saint Helena' },
    'SI': { code: 'SI', name: 'Slovenia' },
    'SJ': { code: 'SJ', name: 'Svalbard and Jan Mayen' },
    'SK': { code: 'SK', name: 'Slovakia' },
    'SL': { code: 'SL', name: 'Sierra Leone' },
    'SM': { code: 'SM', name: 'San Marino' },
    'SN': { code: 'SN', name: 'Senegal' },
    'SO': { code: 'SO', name: 'Somalia' },
    'SR': { code: 'SR', name: 'Suriname' },
    'SS': { code: 'SS', name: 'South Sudan' },
    'ST': { code: 'ST', name: 'São Tomé and Príncipe' },
    'SV': { code: 'SV', name: 'El Salvador' },
    'SX': { code: 'SX', name: 'Sint Maarten' },
    'SY': { code: 'SY', name: 'Syria' },
    'SZ': { code: 'SZ', name: 'Eswatini' },
    
    // T
    'TC': { code: 'TC', name: 'Turks and Caicos Islands' },
    'TD': { code: 'TD', name: 'Chad' },
    'TF': { code: 'TF', name: 'French Southern Territories' },
    'TG': { code: 'TG', name: 'Togo' },
    'TH': { code: 'TH', name: 'Thailand' },
    'TJ': { code: 'TJ', name: 'Tajikistan' },
    'TK': { code: 'TK', name: 'Tokelau' },
    'TL': { code: 'TL', name: 'Timor-Leste' },
    'TM': { code: 'TM', name: 'Turkmenistan' },
    'TN': { code: 'TN', name: 'Tunisia' },
    'TO': { code: 'TO', name: 'Tonga' },
    'TR': { code: 'TR', name: 'Turkey' },
    'TT': { code: 'TT', name: 'Trinidad and Tobago' },
    'TV': { code: 'TV', name: 'Tuvalu' },
    'TW': { code: 'TW', name: 'Taiwan' }, // Excluded per user request
    'TZ': { code: 'TZ', name: 'Tanzania' },
    
    // U
    'UA': { code: 'UA', name: 'Ukraine' },
    'UG': { code: 'UG', name: 'Uganda' },
    'UM': { code: 'UM', name: 'U.S. Outlying Islands' },
    'US': { code: 'US', name: 'United States', buckyDropName: 'USA' }, // Special case: BuckyDrop requires "USA"
    'UY': { code: 'UY', name: 'Uruguay' },
    'UZ': { code: 'UZ', name: 'Uzbekistan' },
    
    // V
    'VA': { code: 'VA', name: 'Vatican City' },
    'VC': { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    'VE': { code: 'VE', name: 'Venezuela' },
    'VG': { code: 'VG', name: 'British Virgin Islands' },
    'VI': { code: 'VI', name: 'U.S. Virgin Islands' },
    'VN': { code: 'VN', name: 'Vietnam' },
    'VU': { code: 'VU', name: 'Vanuatu' },
    
    // W
    'WF': { code: 'WF', name: 'Wallis and Futuna' },
    'WS': { code: 'WS', name: 'Samoa' },
    
    // Y
    'YE': { code: 'YE', name: 'Yemen' },
    'YT': { code: 'YT', name: 'Mayotte' },
    
    // Z
    'ZA': { code: 'ZA', name: 'South Africa' },
    'ZM': { code: 'ZM', name: 'Zambia' },
    'ZW': { code: 'ZW', name: 'Zimbabwe' },
};

/**
 * Get country mapping for a given ISO 3166-1 alpha-2 country code
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'AU', 'GB')
 * @returns {Object} Country mapping object with code, name, and optional buckyDropName
 */
function getCountryMapping(countryCode) {
    if (!countryCode) {
        return { code: 'AU', name: 'Australia' }; // Default fallback
    }
    
    const upperCode = countryCode.toUpperCase();
    return COUNTRY_MAPPING[upperCode] || { 
        code: upperCode, 
        name: upperCode // Fallback: use code as name if not found
    };
}

/**
 * Get BuckyDrop country name for a given country code
 * Uses buckyDropName if available, otherwise uses standard name
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Country name expected by BuckyDrop API
 */
function getBuckyDropCountryName(countryCode) {
    const mapping = getCountryMapping(countryCode);
    
    // Special handling for US - BuckyDrop requires "USA"
    if (countryCode === 'US' && !mapping.buckyDropName) {
        return 'USA';
    }
    
    return mapping.buckyDropName || mapping.name;
}

module.exports = {
    COUNTRY_MAPPING,
    getCountryMapping,
    getBuckyDropCountryName
};

