<?php
/**
 * Plugin Name: Bandit Codes
 * Description: Send your printed QR codes to the right page from your own WordPress site, with no outside service.
 * Version: 1.0.0
 * Author: Patch Bandit
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bandit-codes
 *
 * Copyright (c) 2026 Patch Bandit
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BANDIT_CODES_OPTION_DATA', 'bandit_codes_data' );
define( 'BANDIT_CODES_OPTION_PATH', 'bandit_codes_path' );
define( 'BANDIT_CODES_MAX_URL_LENGTH', 2000 );
define( 'BANDIT_CODES_MAX_NOTE_LENGTH', 200 );
define( 'BANDIT_CODES_MAX_IMPORT_BYTES', 1048576 );

/**
 * Default Bandit Codes v1 store.
 *
 * @return array
 */
function bandit_codes_default_data() {
	return array(
		'v'        => 1,
		'param'    => 'c',
		'fallback' => '/',
		'codes'    => array(),
	);
}

/**
 * Retrieve stored Bandit Codes v1 data.
 *
 * @return array
 */
function bandit_codes_get_data() {
	$raw = get_option( BANDIT_CODES_OPTION_DATA, array() );
	if ( ! is_array( $raw ) ) {
		return bandit_codes_default_data();
	}
	$defaults = bandit_codes_default_data();
	$data     = wp_parse_args( $raw, $defaults );
	if ( ! is_array( $data['codes'] ) ) {
		$data['codes'] = array();
	}
	$data['v'] = 1;
	return $data;
}

/**
 * Retrieve configured route path (default /qr-codes).
 *
 * @return string
 */
function bandit_codes_get_path() {
	$path = get_option( BANDIT_CODES_OPTION_PATH, '/qr-codes' );
	$norm = bandit_codes_validate_path( $path );
	return '' !== $norm ? $norm : '/qr-codes';
}

/**
 * Validate a code ID: 1 to 64 lowercase letters, digits, or hyphens.
 *
 * @param string $id Raw code ID.
 * @return string Validated ID or empty string.
 */
function bandit_codes_validate_id( $id ) {
	if ( ! is_string( $id ) ) {
		return '';
	}
	$id = trim( $id );
	if ( ! preg_match( '/^[a-z0-9-]{1,64}$/', $id ) ) {
		return '';
	}
	$reserved = array( 'constructor', 'prototype', '__proto__', 'tostring', 'valueof', 'hasownproperty' );
	if ( in_array( $id, $reserved, true ) ) {
		return '';
	}
	return $id;
}

/**
 * Validate an http:// or https:// destination URL.
 *
 * @param string $url Raw URL.
 * @return string Clean URL or empty string.
 */
function bandit_codes_validate_url( $url ) {
	if ( ! is_string( $url ) ) {
		return '';
	}
	$url = trim( $url );
	if ( '' === $url || strlen( $url ) > BANDIT_CODES_MAX_URL_LENGTH ) {
		return '';
	}
	if ( preg_match( '/[\x00-\x20\x7f"\'<>\\\\]/', $url ) ) {
		return '';
	}
	$parts = wp_parse_url( $url );
	if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
		return '';
	}
	$scheme = strtolower( $parts['scheme'] );
	if ( 'https' !== $scheme && 'http' !== $scheme ) {
		return '';
	}
	if ( isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
		return '';
	}
	if ( ! preg_match( '/^[A-Za-z0-9.-]+$/', $parts['host'] ) ) {
		return '';
	}
	$clean = esc_url_raw( $url, array( 'http', 'https' ) );
	if ( '' === $clean || strlen( $clean ) > BANDIT_CODES_MAX_URL_LENGTH ) {
		return '';
	}
	return $clean;
}

/**
 * Validate fallback: empty string, single-slash relative path, or http(s) URL.
 *
 * @param string $fallback Raw fallback.
 * @return array Array with keys 'ok' (bool) and 'value' (string).
 */
function bandit_codes_validate_fallback( $fallback ) {
	if ( ! is_string( $fallback ) ) {
		return array( 'ok' => false, 'value' => '' );
	}
	$fallback = trim( $fallback );
	if ( '' === $fallback ) {
		return array( 'ok' => true, 'value' => '' );
	}
	if ( '/' === substr( $fallback, 0, 1 ) ) {
		if ( '//' === substr( $fallback, 0, 2 ) || '/\\' === substr( $fallback, 0, 2 ) ) {
			return array( 'ok' => false, 'value' => '' );
		}
		if ( preg_match( '/[\x00-\x20\x7f"\'<>\\\\]/', $fallback ) || strlen( $fallback ) > BANDIT_CODES_MAX_URL_LENGTH ) {
			return array( 'ok' => false, 'value' => '' );
		}
		return array( 'ok' => true, 'value' => $fallback );
	}
	$valid = bandit_codes_validate_url( $fallback );
	if ( '' === $valid ) {
		return array( 'ok' => false, 'value' => '' );
	}
	return array( 'ok' => true, 'value' => $valid );
}

/**
 * Validate query parameter name.
 *
 * @param string $param Raw param name.
 * @return string Valid param or empty string.
 */
function bandit_codes_validate_param( $param ) {
	if ( ! is_string( $param ) ) {
		return '';
	}
	$param = trim( $param );
	if ( ! preg_match( '/^[A-Za-z0-9_]{1,32}$/', $param ) ) {
		return '';
	}
	return $param;
}

/**
 * Validate endpoint path (for example /qr-codes).
 *
 * @param string $path Raw path.
 * @return string Normalized path without trailing slash, or empty string.
 */
function bandit_codes_validate_path( $path ) {
	if ( ! is_string( $path ) ) {
		return '';
	}
	$path = trim( $path );
	if ( '' === $path || '/' !== substr( $path, 0, 1 ) ) {
		return '';
	}
	if ( false !== strpos( $path, '//' ) || false !== strpos( $path, '?' ) || false !== strpos( $path, '#' ) ) {
		return '';
	}
	$path = rtrim( $path, '/' );
	if ( '' === $path || '/' === $path ) {
		return '';
	}
	if ( ! preg_match( '/^[A-Za-z0-9._~\/-]+$/', $path ) ) {
		return '';
	}
	$segments = explode( '/', $path );
	foreach ( $segments as $seg ) {
		if ( '.' === $seg || '..' === $seg ) {
			return '';
		}
	}
	return $path;
}

/**
 * Validate and sanitize note text.
 *
 * @param string $note Raw note.
 * @return string Clean note.
 */
function bandit_codes_clean_note( $note ) {
	if ( ! is_string( $note ) ) {
		return '';
	}
	$clean = sanitize_text_field( $note );
	if ( function_exists( 'mb_strlen' ) && function_exists( 'mb_substr' ) ) {
		if ( mb_strlen( $clean, 'UTF-8' ) > BANDIT_CODES_MAX_NOTE_LENGTH ) {
			$clean = mb_substr( $clean, 0, BANDIT_CODES_MAX_NOTE_LENGTH, 'UTF-8' );
		}
	} elseif ( strlen( $clean ) > BANDIT_CODES_MAX_NOTE_LENGTH ) {
		$clean = wp_html_excerpt( $clean, BANDIT_CODES_MAX_NOTE_LENGTH, '' );
	}
	return $clean;
}

/**
 * Handle incoming requests to /qr-codes?c=<id> with an HTTP 302 redirect.
 */
function bandit_codes_handle_redirect() {
	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() ) {
		return;
	}
	if ( empty( $_SERVER['REQUEST_URI'] ) ) {
		return;
	}

	$request_uri  = sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) );
	$request_path = wp_parse_url( $request_uri, PHP_URL_PATH );
	if ( ! is_string( $request_path ) ) {
		return;
	}
	$request_path = rtrim( $request_path, '/' );

	$home_path     = wp_parse_url( home_url( '/' ), PHP_URL_PATH );
	$home_prefix   = is_string( $home_path ) ? rtrim( $home_path, '/' ) : '';
	$expected_path = $home_prefix . bandit_codes_get_path();

	if ( $request_path !== $expected_path ) {
		return;
	}

	$data  = bandit_codes_get_data();
	$param = bandit_codes_validate_param( $data['param'] );
	if ( '' === $param ) {
		$param = 'c';
	}

	$raw_id = '';
	if ( isset( $_GET[ $param ] ) && is_string( $_GET[ $param ] ) ) {
		$raw_id = sanitize_text_field( wp_unslash( $_GET[ $param ] ) );
	}

	$code_id = bandit_codes_validate_id( $raw_id );
	if ( '' !== $code_id && isset( $data['codes'][ $code_id ] ) && is_array( $data['codes'][ $code_id ] ) ) {
		$entry  = $data['codes'][ $code_id ];
		$target = isset( $entry['to'] ) ? bandit_codes_validate_url( $entry['to'] ) : '';
		if ( '' !== $target ) {
			nocache_headers();
			wp_redirect( $target, 302, 'Bandit Codes' );
			exit;
		}
	}

	$fb_check = bandit_codes_validate_fallback( $data['fallback'] );
	if ( $fb_check['ok'] && '' !== $fb_check['value'] ) {
		$fb = $fb_check['value'];
		if ( '/' === substr( $fb, 0, 1 ) ) {
			$fb_path = rtrim( $home_prefix . $fb, '/' );
			if ( $fb_path === $expected_path ) {
				return;
			}
			$fb = home_url( $fb );
		}
		nocache_headers();
		wp_redirect( $fb, 302, 'Bandit Codes' );
		exit;
	}
}
add_action( 'parse_request', 'bandit_codes_handle_redirect', 1 );

/**
 * Shortcode [bandit_codes_list] renders an escaped list of active links.
 *
 * @return string
 */
function bandit_codes_list_shortcode() {
	$data  = bandit_codes_get_data();
	$items = array();
	foreach ( $data['codes'] as $id => $entry ) {
		$valid_id = bandit_codes_validate_id( (string) $id );
		if ( '' === $valid_id || ! is_array( $entry ) || ! empty( $entry['retired'] ) ) {
			continue;
		}
		$href = isset( $entry['to'] ) ? bandit_codes_validate_url( $entry['to'] ) : '';
		if ( '' === $href ) {
			continue;
		}
		$note  = isset( $entry['note'] ) ? bandit_codes_clean_note( $entry['note'] ) : '';
		$label = '' !== $note ? $note . ' (' . $valid_id . ')' : $valid_id;
		$items[] = '<li><a href="' . esc_url( $href ) . '" target="_blank" rel="noopener">' . esc_html( $label ) . '</a></li>';
	}
	if ( empty( $items ) ) {
		return '<p>' . esc_html__( 'No active QR links are listed yet.', 'bandit-codes' ) . '</p>';
	}
	return '<nav aria-label="' . esc_attr__( 'QR code links', 'bandit-codes' ) . '"><ul>' . implode( '', $items ) . '</ul></nav>';
}
add_shortcode( 'bandit_codes_list', 'bandit_codes_list_shortcode' );

/**
 * Register the Bandit Codes admin screen.
 */
function bandit_codes_register_menu() {
	add_menu_page(
		__( 'Bandit Codes', 'bandit-codes' ),
		__( 'Bandit Codes', 'bandit-codes' ),
		'manage_options',
		'bandit-codes',
		'bandit_codes_render_admin_page',
		'dashicons-randomize',
		80
	);
}
add_action( 'admin_menu', 'bandit_codes_register_menu' );

/**
 * Redirect back to the Bandit Codes admin page with a notice key.
 *
 * @param string $notice   Notice code.
 * @param int    $count    Saved or imported count.
 * @param int    $received Optional submitted row count.
 * @param int    $skipped  Optional skipped row count.
 */
function bandit_codes_admin_redirect( $notice, $count = 0, $received = 0, $skipped = 0 ) {
	$args = array(
		'page'      => 'bandit-codes',
		'bc_notice' => rawurlencode( $notice ),
		'bc_count'  => absint( $count ),
	);
	if ( $received > 0 ) {
		$args['bc_received'] = absint( $received );
	}
	if ( $skipped > 0 ) {
		$args['bc_skipped'] = absint( $skipped );
	}
	$url = add_query_arg( $args, admin_url( 'admin.php' ) );
	wp_safe_redirect( $url );
	exit;
}

/**
 * Handle saving settings and editable code rows.
 */
function bandit_codes_handle_save() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to manage Bandit Codes.', 'bandit-codes' ), 403 );
	}
	check_admin_referer( 'bandit_codes_save', 'bandit_codes_nonce' );

	// Sentinel placed at the end of the form: if missing, PHP truncated the POST (for example max_input_vars).
	if ( ! isset( $_POST['bc_form_complete'] ) || '1' !== (string) wp_unslash( $_POST['bc_form_complete'] ) ) {
		bandit_codes_admin_redirect( 'truncated' );
	}

	$raw_path = isset( $_POST['bc_path'] ) ? sanitize_text_field( wp_unslash( $_POST['bc_path'] ) ) : '/qr-codes';
	$path     = bandit_codes_validate_path( $raw_path );
	if ( '' === $path ) {
		bandit_codes_admin_redirect( 'bad_path' );
	}

	$raw_param = isset( $_POST['bc_param'] ) ? sanitize_text_field( wp_unslash( $_POST['bc_param'] ) ) : 'c';
	$param     = bandit_codes_validate_param( $raw_param );
	if ( '' === $param ) {
		bandit_codes_admin_redirect( 'bad_param' );
	}

	$raw_fb   = isset( $_POST['bc_fallback'] ) ? sanitize_text_field( wp_unslash( $_POST['bc_fallback'] ) ) : '';
	$fb_check = bandit_codes_validate_fallback( $raw_fb );
	if ( ! $fb_check['ok'] ) {
		bandit_codes_admin_redirect( 'bad_fallback' );
	}

	$ids     = isset( $_POST['bc_id'] ) && is_array( $_POST['bc_id'] ) ? wp_unslash( $_POST['bc_id'] ) : array();
	$urls    = isset( $_POST['bc_to'] ) && is_array( $_POST['bc_to'] ) ? wp_unslash( $_POST['bc_to'] ) : array();
	$notes   = isset( $_POST['bc_note'] ) && is_array( $_POST['bc_note'] ) ? wp_unslash( $_POST['bc_note'] ) : array();
	$retired = isset( $_POST['bc_retired'] ) && is_array( $_POST['bc_retired'] ) ? wp_unslash( $_POST['bc_retired'] ) : array();

	$existing       = bandit_codes_get_data();
	$existing_codes = isset( $existing['codes'] ) && is_array( $existing['codes'] ) ? $existing['codes'] : array();

	$codes           = array();
	$seen_ids        = array();
	$received        = 0;
	$skipped         = 0;
	$skipped_details = array();
	$row_num         = 0;

	foreach ( $ids as $i => $raw_id_val ) {
		$row_num++;
		$raw_id   = is_string( $raw_id_val ) ? trim( $raw_id_val ) : '';
		$raw_to   = isset( $urls[ $i ] ) && is_string( $urls[ $i ] ) ? trim( $urls[ $i ] ) : '';
		$raw_note = isset( $notes[ $i ] ) && is_string( $notes[ $i ] ) ? $notes[ $i ] : '';
		$is_ret   = isset( $retired[ $i ] ) && '1' === (string) $retired[ $i ];

		if ( '' === $raw_id && '' === $raw_to && '' === trim( $raw_note ) ) {
			continue;
		}
		$received++;

		$id = bandit_codes_validate_id( $raw_id );
		if ( '' === $id ) {
			$skipped++;
			if ( count( $skipped_details ) < 20 ) {
				$display_id        = '' !== $raw_id ? bandit_codes_clean_note( $raw_id ) : __( 'blank', 'bandit-codes' );
				$skipped_details[] = sprintf(
					/* translators: 1: row number, 2: submitted code ID */
					__( 'Row %1$d (%2$s): invalid code ID', 'bandit-codes' ),
					$row_num,
					$display_id
				);
			}
			continue;
		}

		if ( isset( $seen_ids[ $id ] ) ) {
			$skipped++;
			if ( count( $skipped_details ) < 20 ) {
				$skipped_details[] = sprintf(
					/* translators: 1: row number, 2: code ID, 3: earlier row number */
					__( 'Row %1$d (%2$s): duplicate code ID (already listed on row %3$d; kept earlier row)', 'bandit-codes' ),
					$row_num,
					$id,
					$seen_ids[ $id ]
				);
			}
			continue;
		}

		$entry = array();
		if ( '' !== $raw_to ) {
			$clean_url = bandit_codes_validate_url( $raw_to );
			if ( '' === $clean_url ) {
				$skipped++;
				if ( isset( $existing_codes[ $id ] ) && is_array( $existing_codes[ $id ] ) ) {
					$codes[ $id ]    = $existing_codes[ $id ];
					$seen_ids[ $id ] = $row_num;
					if ( count( $skipped_details ) < 20 ) {
						$skipped_details[] = sprintf(
							/* translators: 1: row number, 2: code ID */
							__( 'Row %1$d (%2$s): invalid destination URL (kept previous destination)', 'bandit-codes' ),
							$row_num,
							$id
						);
					}
				} elseif ( count( $skipped_details ) < 20 ) {
					$skipped_details[] = sprintf(
						/* translators: 1: row number, 2: code ID */
						__( 'Row %1$d (%2$s): invalid destination URL', 'bandit-codes' ),
						$row_num,
						$id
					);
				}
				continue;
			}
			$entry['to'] = $clean_url;
		} elseif ( ! $is_ret ) {
			$skipped++;
			if ( isset( $existing_codes[ $id ] ) && is_array( $existing_codes[ $id ] ) ) {
				$codes[ $id ]    = $existing_codes[ $id ];
				$seen_ids[ $id ] = $row_num;
				if ( count( $skipped_details ) < 20 ) {
					$skipped_details[] = sprintf(
						/* translators: 1: row number, 2: code ID */
						__( 'Row %1$d (%2$s): missing destination URL (kept previous destination)', 'bandit-codes' ),
						$row_num,
						$id
					);
				}
			} elseif ( count( $skipped_details ) < 20 ) {
				$skipped_details[] = sprintf(
					/* translators: 1: row number, 2: code ID */
					__( 'Row %1$d (%2$s): missing destination URL', 'bandit-codes' ),
					$row_num,
					$id
				);
			}
			continue;
		}

		$clean_note = bandit_codes_clean_note( $raw_note );
		if ( '' !== $clean_note ) {
			$entry['note'] = $clean_note;
		}
		if ( $is_ret ) {
			$entry['retired'] = true;
		}

		$codes[ $id ]    = $entry;
		$seen_ids[ $id ] = $row_num;
	}

	$transient_key = 'bandit_codes_skipped_' . get_current_user_id();
	if ( ! empty( $skipped_details ) ) {
		set_transient( $transient_key, $skipped_details, 60 );
	} else {
		delete_transient( $transient_key );
	}

	update_option( BANDIT_CODES_OPTION_PATH, $path, true );
	update_option(
		BANDIT_CODES_OPTION_DATA,
		array(
			'v'        => 1,
			'param'    => $param,
			'fallback' => $fb_check['value'],
			'codes'    => $codes,
		),
		false
	);

	if ( $skipped > 0 ) {
		bandit_codes_admin_redirect( 'saved_with_skipped', count( $codes ), $received, $skipped );
	}
	bandit_codes_admin_redirect( 'saved', count( $codes ), $received, 0 );
}
add_action( 'admin_post_bandit_codes_save', 'bandit_codes_handle_save' );

/**
 * Handle importing Bandit Codes v1 JSON.
 */
function bandit_codes_handle_import() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to import Bandit Codes.', 'bandit-codes' ), 403 );
	}
	check_admin_referer( 'bandit_codes_import', 'bandit_codes_import_nonce' );

	$raw_json = isset( $_POST['bc_import_json'] ) && is_string( $_POST['bc_import_json'] )
		? trim( wp_unslash( $_POST['bc_import_json'] ) )
		: '';

	if ( '' === $raw_json || strlen( $raw_json ) > BANDIT_CODES_MAX_IMPORT_BYTES ) {
		bandit_codes_admin_redirect( 'bad_import' );
	}

	$decoded = json_decode( $raw_json, true );
	if ( ! is_array( $decoded ) || ! isset( $decoded['v'] ) || 1 !== (int) $decoded['v'] || empty( $decoded['codes'] ) || ! is_array( $decoded['codes'] ) ) {
		bandit_codes_admin_redirect( 'bad_import' );
	}

	$data      = bandit_codes_get_data();
	$overwrite = ! empty( $_POST['bc_import_overwrite'] );
	$imported  = 0;

	foreach ( $decoded['codes'] as $raw_id => $entry ) {
		$id = bandit_codes_validate_id( (string) $raw_id );
		if ( '' === $id || ! is_array( $entry ) ) {
			continue;
		}
		if ( isset( $data['codes'][ $id ] ) && ! $overwrite ) {
			continue;
		}
		$is_ret = ! empty( $entry['retired'] );
		$clean  = array();
		if ( isset( $entry['to'] ) && '' !== $entry['to'] ) {
			$url = bandit_codes_validate_url( (string) $entry['to'] );
			if ( '' === $url ) {
				continue;
			}
			$clean['to'] = $url;
		} elseif ( ! $is_ret ) {
			continue;
		}
		if ( isset( $entry['note'] ) ) {
			$note = bandit_codes_clean_note( (string) $entry['note'] );
			if ( '' !== $note ) {
				$clean['note'] = $note;
			}
		}
		if ( $is_ret ) {
			$clean['retired'] = true;
		}
		$data['codes'][ $id ] = $clean;
		$imported++;
	}

	update_option( BANDIT_CODES_OPTION_DATA, $data, false );
	bandit_codes_admin_redirect( 'imported', $imported );
}
add_action( 'admin_post_bandit_codes_import', 'bandit_codes_handle_import' );

/**
 * Handle exporting Bandit Codes v1 JSON.
 */
function bandit_codes_handle_export() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to export Bandit Codes.', 'bandit-codes' ), 403 );
	}
	check_admin_referer( 'bandit_codes_export', 'bandit_codes_export_nonce' );

	$data          = bandit_codes_get_data();
	$data['codes'] = (object) $data['codes'];
	nocache_headers();
	header( 'Content-Type: application/json; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename="codes.json"' );
	header( 'X-Content-Type-Options: nosniff' );
	echo wp_json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n";
	exit;
}
add_action( 'admin_post_bandit_codes_export', 'bandit_codes_handle_export' );

/**
 * Render the Bandit Codes admin screen.
 */
function bandit_codes_render_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to view this page.', 'bandit-codes' ), 403 );
	}

	$data     = bandit_codes_get_data();
	$path     = bandit_codes_get_path();
	$param    = $data['param'];
	$notice   = isset( $_GET['bc_notice'] ) ? sanitize_key( wp_unslash( $_GET['bc_notice'] ) ) : '';
	$count    = isset( $_GET['bc_count'] ) ? absint( $_GET['bc_count'] ) : 0;
	$received = isset( $_GET['bc_received'] ) ? absint( $_GET['bc_received'] ) : 0;
	$skipped  = isset( $_GET['bc_skipped'] ) ? absint( $_GET['bc_skipped'] ) : 0;

	$skipped_details = array();
	if ( 'saved_with_skipped' === $notice ) {
		$transient_key = 'bandit_codes_skipped_' . get_current_user_id();
		$stored_skip   = get_transient( $transient_key );
		if ( is_array( $stored_skip ) ) {
			$skipped_details = $stored_skip;
		}
		delete_transient( $transient_key );
	}

	$max_input_vars = (int) ini_get( 'max_input_vars' );
	$safe_table_max = $max_input_vars > 0 ? max( 1, (int) floor( ( $max_input_vars - 20 ) / 4 ) ) : 0;
	$code_count     = count( $data['codes'] );
	?>
	<div class="wrap">
		<h1><?php echo esc_html__( 'Bandit Codes', 'bandit-codes' ); ?></h1>
		<p>
			<?php
			echo esc_html(
				sprintf(
					/* translators: %s: sample QR code URL */
					__( 'Point your printed QR codes at %s and change destinations here anytime without reprinting.', 'bandit-codes' ),
					home_url( $path . '?' . $param . '=menu' )
				)
			);
			?>
		</p>

		<?php if ( $safe_table_max > 0 && $code_count >= (int) floor( $safe_table_max * 0.8 ) ) : ?>
			<div class="notice notice-warning">
				<p>
					<?php
					echo esc_html(
						sprintf(
							/* translators: 1: current code count, 2: estimated safe row limit, 3: PHP max_input_vars */
							__( 'You have %1$d codes. Your server limits form saves to roughly %2$d rows (PHP max_input_vars = %3$d). For large lists, use Import JSON below instead of the table save button so no codes are cut off.', 'bandit-codes' ),
							$code_count,
							$safe_table_max,
							$max_input_vars
						)
					);
					?>
				</p>
			</div>
		<?php endif; ?>

		<?php if ( 'saved' === $notice ) : ?>
			<div class="notice notice-success is-dismissible"><p><?php echo esc_html( sprintf( __( 'Saved %1$d code(s) from %2$d submitted row(s).', 'bandit-codes' ), $count, $received ) ); ?></p></div>
		<?php elseif ( 'saved_with_skipped' === $notice ) : ?>
			<div class="notice notice-warning is-dismissible">
				<p><?php echo esc_html( sprintf( __( 'Saved %1$d code(s) from %2$d submitted row(s). %3$d row(s) were skipped or kept as before:', 'bandit-codes' ), $count, $received, $skipped ) ); ?></p>
				<?php if ( ! empty( $skipped_details ) ) : ?>
					<ul>
						<?php foreach ( $skipped_details as $detail ) : ?>
							<li><?php echo esc_html( (string) $detail ); ?></li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</div>
		<?php elseif ( 'truncated' === $notice ) : ?>
			<div class="notice notice-error is-dismissible"><p><?php echo esc_html__( 'Save canceled because your server cut off the form before the last row (usually caused by PHP max_input_vars). Your existing codes were not changed. Use Import JSON below for large lists.', 'bandit-codes' ); ?></p></div>
		<?php elseif ( 'imported' === $notice ) : ?>
			<div class="notice notice-success is-dismissible"><p><?php echo esc_html( sprintf( __( 'Imported %d code(s).', 'bandit-codes' ), $count ) ); ?></p></div>
		<?php elseif ( in_array( $notice, array( 'bad_path', 'bad_param', 'bad_fallback', 'bad_import' ), true ) ) : ?>
			<div class="notice notice-error is-dismissible"><p><?php echo esc_html__( 'That input was not valid. Please check the path, parameter, fallback, or JSON format and try again.', 'bandit-codes' ); ?></p></div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="bandit_codes_save" />
			<?php wp_nonce_field( 'bandit_codes_save', 'bandit_codes_nonce' ); ?>

			<h2><?php echo esc_html__( 'Settings', 'bandit-codes' ); ?></h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="bc_path"><?php echo esc_html__( 'QR page path', 'bandit-codes' ); ?></label></th>
					<td><input name="bc_path" id="bc_path" type="text" class="regular-text" value="<?php echo esc_attr( $path ); ?>" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="bc_param"><?php echo esc_html__( 'Query parameter', 'bandit-codes' ); ?></label></th>
					<td><input name="bc_param" id="bc_param" type="text" class="small-text" value="<?php echo esc_attr( $param ); ?>" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="bc_fallback"><?php echo esc_html__( 'Fallback address', 'bandit-codes' ); ?></label></th>
					<td>
						<input name="bc_fallback" id="bc_fallback" type="text" class="regular-text" value="<?php echo esc_attr( $data['fallback'] ); ?>" />
						<p class="description"><?php echo esc_html__( 'Used when a code is unknown or missing (for example /). Leave blank to let your WordPress page show [bandit_codes_list].', 'bandit-codes' ); ?></p>
					</td>
				</tr>
			</table>

			<h2><?php echo esc_html__( 'Codes', 'bandit-codes' ); ?></h2>
			<p class="description"><?php echo esc_html__( 'Checking Retired hides a code from the public list. Clear its Destination URL as well if you want scans to go to your fallback address instead of forwarding.', 'bandit-codes' ); ?></p>
			<table class="widefat striped" id="bandit-codes-table">
				<thead>
					<tr>
						<th><?php echo esc_html__( 'Code ID (a-z, 0-9, -)', 'bandit-codes' ); ?></th>
						<th><?php echo esc_html__( 'Destination URL (https:// or http://)', 'bandit-codes' ); ?></th>
						<th><?php echo esc_html__( 'Note', 'bandit-codes' ); ?></th>
						<th><?php echo esc_html__( 'Retired (hide from list)', 'bandit-codes' ); ?></th>
						<th><?php echo esc_html__( 'Test', 'bandit-codes' ); ?></th>
						<th><?php echo esc_html__( 'Action', 'bandit-codes' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php
					$row_index = 0;
					foreach ( $data['codes'] as $id => $entry ) :
						$id_str   = (string) $id;
						$to_val   = isset( $entry['to'] ) ? (string) $entry['to'] : '';
						$note_val = isset( $entry['note'] ) ? (string) $entry['note'] : '';
						$ret_val  = ! empty( $entry['retired'] );
						$test_url = home_url( $path . '?' . rawurlencode( $param ) . '=' . rawurlencode( $id_str ) );
						?>
						<tr>
							<td><input type="text" name="bc_id[<?php echo esc_attr( (string) $row_index ); ?>]" value="<?php echo esc_attr( $id_str ); ?>" class="regular-text" /></td>
							<td><input type="url" name="bc_to[<?php echo esc_attr( (string) $row_index ); ?>]" value="<?php echo esc_attr( $to_val ); ?>" class="large-text" /></td>
							<td><input type="text" name="bc_note[<?php echo esc_attr( (string) $row_index ); ?>]" value="<?php echo esc_attr( $note_val ); ?>" class="regular-text" /></td>
							<td><input type="checkbox" name="bc_retired[<?php echo esc_attr( (string) $row_index ); ?>]" value="1" <?php checked( $ret_val ); ?> /></td>
							<td><a href="<?php echo esc_url( $test_url ); ?>" target="_blank" rel="noopener"><?php echo esc_html__( 'Test', 'bandit-codes' ); ?></a></td>
							<td><button type="button" class="button bc-remove-row"><?php echo esc_html__( 'Remove', 'bandit-codes' ); ?></button></td>
						</tr>
						<?php
						$row_index++;
					endforeach;
					?>
				</tbody>
			</table>

			<p>
				<button type="button" class="button" id="bc-add-row"><?php echo esc_html__( 'Add Code Row', 'bandit-codes' ); ?></button>
			</p>
			<input type="hidden" name="bc_form_complete" value="1" />
			<?php submit_button( __( 'Save Changes', 'bandit-codes' ) ); ?>
		</form>

		<hr />
		<h2><?php echo esc_html__( 'Import or Export Bandit Codes JSON', 'bandit-codes' ); ?></h2>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom: 16px;">
			<input type="hidden" name="action" value="bandit_codes_import" />
			<?php wp_nonce_field( 'bandit_codes_import', 'bandit_codes_import_nonce' ); ?>
			<p><label for="bc_import_json"><?php echo esc_html__( 'Paste codes.json content to bulk-import:', 'bandit-codes' ); ?></label></p>
			<textarea name="bc_import_json" id="bc_import_json" rows="6" class="large-text code"></textarea>
			<p>
				<label>
					<input type="checkbox" name="bc_import_overwrite" value="1" />
					<?php echo esc_html__( 'Overwrite existing code IDs with imported values', 'bandit-codes' ); ?>
				</label>
			</p>
			<?php submit_button( __( 'Import JSON', 'bandit-codes' ), 'secondary', 'submit', false ); ?>
		</form>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="bandit_codes_export" />
			<?php wp_nonce_field( 'bandit_codes_export', 'bandit_codes_export_nonce' ); ?>
			<?php submit_button( __( 'Download codes.json Backup', 'bandit-codes' ), 'secondary', 'submit', false ); ?>
		</form>
	</div>

	<script>
	(function () {
		var tbody = document.querySelector('#bandit-codes-table tbody');
		var addBtn = document.getElementById('bc-add-row');
		if (!tbody || !addBtn) return;
		var nextIdx = <?php echo (int) $row_index; ?>;
		var saveFirstLabel = <?php echo wp_json_encode( __( 'Save first', 'bandit-codes' ) ); ?>;
		var removeLabel = <?php echo wp_json_encode( __( 'Remove', 'bandit-codes' ) ); ?>;
		function bindRemove(btn) {
			btn.addEventListener('click', function () {
				var tr = btn.closest('tr');
				if (tr && tr.parentNode) tr.parentNode.removeChild(tr);
			});
		}
		var existing = tbody.querySelectorAll('.bc-remove-row');
		for (var i = 0; i < existing.length; i++) bindRemove(existing[i]);
		addBtn.addEventListener('click', function () {
			var idx = nextIdx++;
			var tr = document.createElement('tr');
			var fields = [
				{ name: 'bc_id[' + idx + ']', type: 'text', cls: 'regular-text', placeholder: 'menu' },
				{ name: 'bc_to[' + idx + ']', type: 'url', cls: 'large-text', placeholder: 'https://example.com/menu.pdf' },
				{ name: 'bc_note[' + idx + ']', type: 'text', cls: 'regular-text', placeholder: 'Table tent' }
			];
			for (var j = 0; j < fields.length; j++) {
				var td = document.createElement('td');
				var input = document.createElement('input');
				input.type = fields[j].type;
				input.name = fields[j].name;
				input.className = fields[j].cls;
				input.placeholder = fields[j].placeholder;
				td.appendChild(input);
				tr.appendChild(td);
			}
			var tdRet = document.createElement('td');
			var cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.name = 'bc_retired[' + idx + ']';
			cb.value = '1';
			tdRet.appendChild(cb);
			tr.appendChild(tdRet);

			var tdTest = document.createElement('td');
			tdTest.textContent = saveFirstLabel;
			tr.appendChild(tdTest);

			var tdAct = document.createElement('td');
			var btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'button bc-remove-row';
			btn.textContent = removeLabel;
			bindRemove(btn);
			tdAct.appendChild(btn);
			tr.appendChild(tdAct);

			tbody.appendChild(tr);
		});
	})();
	</script>
	<?php
}
