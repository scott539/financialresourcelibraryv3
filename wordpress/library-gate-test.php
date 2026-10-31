<?php
/**
 * BPM Library Gate Test — admin-only, separate from the public library.
 * Install as a new WPCode PHP snippet (without the opening PHP tag), Run Everywhere.
 * Disable this one snippet to remove the test screen and revoke all test grants.
 * Requires the existing, connected Kit plugin. No credentials are copied.
 */
if (!defined('ABSPATH')) { return; }
if (!class_exists('BPM_Library_Gate_Test')) {
final class BPM_Library_Gate_Test {
    const COOKIE = '__Host-bpm_library_test';
    const OPTION = 'bpm_library_gate_test_config';
    const PREFIX = 'bpm_lgt_';
    // Exact, owner-approved test address; its plaintext is entered only in wp-admin.
    const EMAIL_HASH = '5ef74b8714ab36c4926130a0a969b321ea1163b77d68f3a19cd67f09d93d1f47';
    public static function boot() {
        add_action('admin_menu', function() {
            add_management_page('Library Gate Test', 'Library Gate Test', 'manage_options', 'bpm-library-gate-test', array(__CLASS__, 'screen'));
        });
        add_action('wp_ajax_bpm_library_gate_test', array(__CLASS__, 'ajax'));
        add_action('rest_api_init', function() {
            register_rest_route('bpm-library-test/v1', '/redeem', array(
                'methods'=>'POST', 'callback'=>array(__CLASS__, 'redeem'), 'permission_callback'=>'__return_true'
            ));
        });
    }
    private static function config() { return get_option(self::OPTION, array()); }
    private static function api() {
        if (!class_exists('ConvertKit_API_V4') || !class_exists('ConvertKit_Settings')) { throw new Exception('Kit plugin unavailable.'); }
        $settings = new ConvertKit_Settings();
        if (!$settings->has_access_and_refresh_token()) { throw new Exception('Connect Kit first.'); }
        // Force debug off for authentication: no codes, tokens or profiles in logs.
        return new ConvertKit_API_V4(CONVERTKIT_OAUTH_CLIENT_ID, CONVERTKIT_OAUTH_CLIENT_REDIRECT_URI,
            $settings->get_access_token(), $settings->get_refresh_token(), false, 'bpm_library_test');
    }
    private static function random() { return bin2hex(random_bytes(32)); }
    private static function key($kind, $token) { return self::PREFIX.$kind.'_'.hash('sha256',$token); }
    private static function cookie($value, $expires) {
        setcookie(self::COOKIE, $value, array('expires'=>$expires, 'path'=>'/', 'secure'=>true, 'httponly'=>true, 'samesite'=>'Lax'));
    }
    private static function session() {
        $token = isset($_COOKIE[self::COOKIE]) ? $_COOKIE[self::COOKIE] : '';
        if (!preg_match('/^[a-f0-9]{64}$/D', $token)) { return false; }
        $data = get_transient(self::key('session',$token));
        return is_array($data) && isset($data['subscriberId']) ? $data : false;
    }
    // Atomic time bucket. DB-backed, independent of PHP worker lifetime.
    private static function rate($scope, $limit, $seconds) {
        global $wpdb;
        $key=self::PREFIX.'rate_'.hash('sha256',$scope.'_'.floor(time()/$seconds));
        $until=(int)((floor(time()/$seconds)+1)*$seconds);
        add_option($key, wp_json_encode(array('n'=>0,'until'=>$until)), '', false);
        $row=$wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",$key));
        $data=json_decode($row,true);
        if (!is_array($data) || $data['n'] >= $limit) { return false; }
        $next=wp_json_encode(array('n'=>$data['n']+1,'until'=>$until));
        $updated=$wpdb->query($wpdb->prepare("UPDATE {$wpdb->options} SET option_value=%s WHERE option_name=%s AND option_value=%s",$next,$key,$row));
        wp_cache_delete($key,'options');
        return $updated === 1;
    }
    private static function cleanup() {
        global $wpdb;
        // At most 100 small expired test records per request; no production records.
        $rows=$wpdb->get_results($wpdb->prepare("SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s LIMIT 100",$wpdb->esc_like(self::PREFIX.'rate_').'%', $wpdb->esc_like(self::PREFIX.'grant_').'%'));
        foreach ($rows as $row) { $data=json_decode($row->option_value,true); if (is_array($data) && ($data['until'] ?? PHP_INT_MAX) < time()) { delete_option($row->option_name); } }
    }
    public static function ajax() {
        nocache_headers();
        if (!current_user_can('manage_options') || !check_ajax_referer('bpm-library-gate-test','nonce',false)) { wp_send_json_error(array('message'=>'Admin test access required.'),403); }
        $origin=isset($_SERVER['HTTP_ORIGIN']) ? rtrim($_SERVER['HTTP_ORIGIN'],'/') : '';
        if ($origin !== rtrim(home_url(),'/')) { wp_send_json_error(array('message'=>'Invalid origin.'),403); }
        self::cleanup();
        $op=isset($_POST['op']) ? sanitize_key($_POST['op']) : '';
        $config=self::config();
        try {
            if ($op === 'configure') {
                $email=strtolower(trim(wp_unslash($_POST['email'] ?? '')));
                $preview=trim(wp_unslash($_POST['preview'] ?? ''));
                if (!is_email($email) || !hash_equals(self::EMAIL_HASH,hash('sha256',$email))) { throw new Exception('Use the approved test email address.'); }
                if (!preg_match('~^https://financialresourcelibraryv3-[a-z0-9-]+-bigger-pockets-money\.vercel\.app$~D',$preview)) { throw new Exception('Use the isolated Vercel preview URL.'); }
                update_option(self::OPTION,array('email'=>$email,'preview'=>$preview),false);
                wp_send_json_success(array('message'=>'Test configuration saved. Public downloads unchanged.'));
            }
            if ($op === 'status') { wp_send_json_success(array('verified'=>(bool)self::session())); }
            if ($op === 'logout') {
                $token=$_COOKIE[self::COOKIE] ?? '';
                if (preg_match('/^[a-f0-9]{64}$/D',$token)) { delete_transient(self::key('session',$token)); }
                self::cookie('',time()-3600);
                wp_send_json_success(array('message'=>'Test browser access cleared.'));
            }
            if (empty($config['email'])) { throw new Exception('Save the test configuration first.'); }
            if ($op === 'send') {
                if (!self::rate('send',3,3600) || !self::rate('send-minute',1,60)) { throw new Exception('Please wait before requesting another code.'); }
                $api=self::api();
                // The destination email is server-configured, never taken from this request.
                $token=$api->subscriber_authentication_send_code($config['email'],admin_url('tools.php?page=bpm-library-gate-test'));
                if (is_wp_error($token) || !is_string($token) || !$token) { throw new Exception('Kit could not send a login code. No subscription was changed.'); }
                set_transient(self::PREFIX.'challenge_'.get_current_user_id(),array('token'=>$token,'until'=>time()+600),600);
                wp_send_json_success(array('message'=>'Kit sent a login code to the approved test inbox. Enter the code below.'));
            }
            if ($op === 'verify') {
                if (!self::rate('verify_'.get_current_user_id(),5,600)) { throw new Exception('Too many attempts. Please wait and request a new code.'); }
                $challenge=get_transient(self::PREFIX.'challenge_'.get_current_user_id());
                if (!$challenge || $challenge['until'] < time()) { throw new Exception('Request a fresh login code.'); }
                $code=trim(wp_unslash($_POST['code'] ?? ''));
                if (!$code || strlen($code)>64) { throw new Exception('Enter the login code from Kit.'); }
                $api=self::api();
                $signed=$api->subscriber_authentication_verify($challenge['token'],$code);
                if (is_wp_error($signed) || !is_string($signed) || !$signed) { throw new Exception('Code not accepted. Please check the code from Kit.'); }
                delete_transient(self::PREFIX.'challenge_'.get_current_user_id());
                $profile=$api->profile($signed);
                $expected=$api->get_subscriber_id($config['email']);
                if (is_wp_error($profile) || is_wp_error($expected) || empty($profile['id']) || (string)$profile['id'] !== (string)$expected) { throw new Exception('The verified subscriber did not match the test account.'); }
                $session=self::random();
                set_transient(self::key('session',$session),array('subscriberId'=>(string)$profile['id']),30*DAY_IN_SECONDS);
                self::cookie($session,time()+30*DAY_IN_SECONDS);
                wp_send_json_success(array('verified'=>true,'message'=>'Verified. This browser can test downloads for 30 days.'));
            }
            if ($op === 'grant') {
                $session=self::session();
                if (!$session) { wp_send_json_error(array('message'=>'Verify your test subscription above, then try the resource again.'),401); }
                if (!self::rate('grant_'.get_current_user_id(),30,60)) { throw new Exception('Please wait a moment.'); }
                $id=sanitize_text_field(wp_unslash($_POST['id'] ?? ''));
                $action=sanitize_key($_POST['resourceAction'] ?? '');
                if (!preg_match('/^[a-zA-Z0-9-]{1,80}$/D',$id) || !in_array($action,array('downloads','copyopens'),true)) { throw new Exception('Unknown resource action.'); }
                $action=$action==='copyopens' ? 'copyOpens' : 'downloads';
                $token=self::random();
                add_option(self::key('grant',$token),wp_json_encode(array('subscriberId'=>$session['subscriberId'],'id'=>$id,'action'=>$action,'until'=>time()+120)), '',false);
                wp_send_json_success(array('token'=>$token));
            }
            throw new Exception('Unknown test action.');
        } catch (Throwable $error) {
            // Only bounded, local messages are rendered; never expose remote errors/tokens.
            $message=$error instanceof Exception && !($error instanceof Error) ? $error->getMessage() : 'Test unavailable. Check the Kit connection.';
            wp_send_json_error(array('message'=>$message),400);
        }
    }
    public static function redeem($request) {
        $token=$request->get_param('token'); $id=$request->get_param('id'); $action=$request->get_param('action');
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D',$token)) { return new WP_Error('denied','Access required.',array('status'=>401)); }
        $key=self::key('grant',$token);
        $grant=json_decode(get_option($key,''),true);
        if (!is_array($grant) || $grant['until']<time() || $grant['id']!==$id || $grant['action']!==$action) { return new WP_Error('denied','Access required.',array('status'=>401)); }
        // delete_option reports whether this request won the one-use redemption.
        if (!delete_option($key)) { return new WP_Error('denied','Access required.',array('status'=>401)); }
        $response=new WP_REST_Response(array('subscriberId'=>$grant['subscriberId'],'id'=>$id,'action'=>$action));
        $response->header('Cache-Control','private, no-store');
        return $response;
    }
    public static function screen() {
        if (!current_user_can('manage_options')) { return; }
        $config=self::config();
        $nonce=wp_create_nonce('bpm-library-gate-test');
        ?>
        <div class="wrap"><h1>Resource Library — private gate test</h1>
        <p>This screen is restricted to WordPress administrators and the approved test subscriber. Public downloads and historical counts are unchanged.</p>
        <details <?php echo empty($config['email']) ? 'open' : ''; ?>><summary>Test configuration</summary>
        <p><label>Approved test email <input id="bpm-test-email" type="email" autocomplete="off" value="<?php echo esc_attr($config['email'] ?? ''); ?>" size="45"></label></p>
        <p><label>Isolated preview URL <input id="bpm-test-preview" type="url" value="<?php echo esc_attr($config['preview'] ?? ''); ?>" size="85"></label></p>
        <button id="bpm-test-save" class="button">Save test configuration</button></details>
        <div style="background:white;padding:20px;margin:20px 0;max-width:900px;border:1px solid #ddd">
        <h2>Verify subscriber access</h2><p>Kit sends a one-time login code to the approved test inbox. It does not create or reactivate a subscription.</p>
        <button id="bpm-test-send" class="button">Send login code</button>
        <label for="bpm-test-code">Login code</label> <input id="bpm-test-code" type="text" autocomplete="one-time-code" inputmode="numeric" style="width:140px">
        <button id="bpm-test-verify" class="button button-primary">Verify code</button>
        <button id="bpm-test-logout" class="button">Clear test browser access</button>
        <p id="bpm-test-status" role="status" aria-live="polite">Checking browser access…</p></div>
        <?php if (!empty($config['preview'])) { ?>
        <iframe id="bpm-test-frame" title="Resource Library gate preview" src="<?php echo esc_url($config['preview'].'/#/'); ?>" style="width:100%;height:1100px;border:1px solid #ddd;background:white"></iframe>
        <?php } ?>
        </div>
        <script>
        (()=>{
          const ajax=<?php echo wp_json_encode(admin_url('admin-ajax.php')); ?>;
          const nonce=<?php echo wp_json_encode($nonce); ?>;
          const preview=<?php echo wp_json_encode($config['preview'] ?? ''); ?>;
          const status=document.getElementById('bpm-test-status');
          async function call(op,fields={}) {
            const response=await fetch(ajax,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'bpm_library_gate_test',nonce,op,...fields})});
            const result=await response.json(); if(!result.success) throw Error(result.data?.message||'Test request failed.'); return result.data;
          }
          async function run(button,op,fields={}) {
            button.disabled=true;try {const data=await call(op,fields);status.textContent=data.message||'';return data;}catch(e){status.textContent=e.message;}finally{button.disabled=false;}
          }
          document.getElementById('bpm-test-save').onclick=async e=>{if(await run(e.target,'configure',{email:document.getElementById('bpm-test-email').value,preview:document.getElementById('bpm-test-preview').value})) location.reload();};
          document.getElementById('bpm-test-send').onclick=e=>run(e.target,'send');
          document.getElementById('bpm-test-verify').onclick=async e=>{await run(e.target,'verify',{code:document.getElementById('bpm-test-code').value});document.getElementById('bpm-test-code').value='';};
          document.getElementById('bpm-test-logout').onclick=e=>run(e.target,'logout');
          call('status').then(data=>status.textContent=data.verified?'Verified browser. Choose a download below.':'Not yet verified. Request a login code to begin.').catch(e=>status.textContent=e.message);
          window.addEventListener('message',async event=>{
            const frame=document.getElementById('bpm-test-frame');
            if(!preview||event.origin!==preview||event.source!==frame?.contentWindow||event.data?.type!=='bpm-library-request-grant')return;
            const {requestId,id,action}=event.data;
            if(typeof requestId!=='string'||requestId.length>50||typeof id!=='string'||!['downloads','copyOpens'].includes(action))return;
            try {const data=await call('grant',{id,resourceAction:action});frame.contentWindow.postMessage({type:'bpm-library-grant',requestId,token:data.token},preview);}
            catch(e){status.textContent=e.message;frame.contentWindow.postMessage({type:'bpm-library-grant',requestId},preview);}
          });
        })();
        </script>
        <?php
    }
}
BPM_Library_Gate_Test::boot();

}
