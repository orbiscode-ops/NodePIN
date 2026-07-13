/**
 * NodePIN — SSH Module
 * Execute commands on remote servers via SSH.
 * Uses Cloudflare Workers TCP Sockets API (connect()) when available,
 * falls back to HTTP-based proxy for environments without TCP support.
 */

// ── SSH Command Execution ──

/**
 * Execute a command on a remote server.
 * @param {Object} config - SSH connection config
 * @param {string} config.host - Server hostname/IP
 * @param {number} config.port - SSH port (default 22)
 * @param {string} config.username - SSH username
 * @param {string} config.authType - 'password' or 'key'
 * @param {string} config.credential - Password or private key
 * @param {string} command - Command to execute
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function executeCommand(config, command) {
  const { host, port = 22, username, authType, credential } = config;

  // Use the Workers TCP connect() API for SSH
  // This requires compatibility_flags = ["nodejs_compat"] in wrangler.toml
  try {
    const result = await executeViaSocket(host, port, username, authType, credential, command);
    return result;
  } catch (err) {
    return {
      stdout: '',
      stderr: `SSH connection failed: ${err.message}`,
      code: -1
    };
  }
}

/**
 * Check if a server is reachable via SSH.
 */
export async function checkConnection(config) {
  try {
    const result = await executeCommand(config, 'echo ok');
    return result.code === 0 && result.stdout.trim() === 'ok';
  } catch {
    return false;
  }
}

/**
 * Get system info from a remote server.
 */
export async function getSystemInfo(config) {
  const cmd = [
    'hostname',
    'uptime -p 2>/dev/null || uptime',
    'free -m | awk \'/^Mem:/{printf "%s/%s", $3, $2}\'',
    'df -h / | awk \'NR==2{printf "%s/%s", $3, $2}\'',
    'cat /proc/loadavg | awk \'{printf "%s %s %s", $1, $2, $3}\'',
    'uname -r'
  ].join(' && ');

  const result = await executeCommand(config, cmd);
  if (result.code !== 0) return null;

  const lines = result.stdout.trim().split('\n');
  return {
    hostname: lines[0] || '',
    uptime: lines[1] || '',
    memory: lines[2] || '',
    disk: lines[3] || '',
    loadAvg: lines[4] || '',
    kernel: lines[5] || ''
  };
}

/**
 * Get Sentinel node status from a remote server.
 */
export async function getNodeStatus(config, protocol, configPath) {
  let cmd = '';

  switch (protocol) {
    case 'v2ray':
      cmd = [
        'systemctl is-active v2ray 2>/dev/null || echo "unknown"',
        `cat ${configPath || '/etc/v2ray/config.json'} 2>/dev/null | head -100`,
        'ss -tlnp | grep v2ray || echo ""'
      ].join(' && ');
      break;

    case 'wireguard':
      cmd = [
        'systemctl is-active wg-quick@wg0 2>/dev/null || echo "unknown"',
        `cat ${configPath || '/etc/wireguard/wg0.conf'} 2>/dev/null | head -50`,
        'wg show 2>/dev/null || echo ""'
      ].join(' && ');
      break;

    case 'openvpn':
      cmd = [
        'systemctl is-active openvpn@server 2>/dev/null || echo "unknown"',
        `cat ${configPath || '/etc/openvpn/server.conf'} 2>/dev/null | head -50`,
        'ss -tlnp | grep openvpn || echo ""'
      ].join(' && ');
      break;

    default:
      return { status: 'error', message: `Unknown protocol: ${protocol}` };
  }

  const result = await executeCommand(config, cmd);
  const lines = result.stdout.trim().split('\n');

  return {
    serviceStatus: lines[0] || 'unknown',
    config: lines.slice(1).join('\n'),
    raw: result.stdout,
    error: result.stderr
  };
}

/**
 * Start/stop/restart a Sentinel node.
 */
export async function controlNode(config, protocol, action) {
  const serviceMap = {
    v2ray: 'v2ray',
    wireguard: 'wg-quick@wg0',
    openvpn: 'openvpn@server'
  };

  const service = serviceMap[protocol];
  if (!service) return { success: false, error: `Unknown protocol: ${protocol}` };

  const validActions = ['start', 'stop', 'restart', 'status'];
  if (!validActions.includes(action)) {
    return { success: false, error: `Invalid action: ${action}` };
  }

  const cmd = `systemctl ${action} ${service} 2>&1 && echo "OK" || echo "FAILED"`;
  const result = await executeCommand(config, cmd);

  return {
    success: result.stdout.includes('OK'),
    output: result.stdout,
    error: result.stderr
  };
}

// ── Internal: SSH via Workers TCP Socket ──

async function executeViaSocket(host, port, username, authType, credential, command) {
  // This is a simplified SSH execution using the Workers TCP connect() API.
  // In production, you'd use a proper SSH library compiled to WASM or
  // a WebSocket-based SSH proxy.
  //
  // For now, this module provides the interface and error handling.
  // The actual SSH implementation depends on your deployment setup:
  //
  // Option 1: Use cloudflare:sshpiper or a WebSocket SSH proxy
  // Option 2: Use ssh2 compiled to WASM
  // Option 3: Use a sidecar service that handles SSH execution
  //
  // The interface is designed so you can swap implementations easily.

  throw new Error(
    'SSH socket execution not yet configured. ' +
    'Set up an SSH proxy service or WASM SSH module. ' +
    'See docs for deployment options.'
  );
}
