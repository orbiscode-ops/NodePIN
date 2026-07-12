// Sentinel dVPN provider for NodePIN.
// Dynamically scans running docker containers with label com.nodepin.network=sentinel
// and fetches their wallet balances and statuses.

const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');

const docker = global.__DOCKER_MOCK__ || new Docker({ socketPath: '/var/run/docker.sock' });

async function getWalletBalance(address) {
  if (!address) return '0.00 DVPN';
  const urls = [
    `https://api-sentinel.busurnode.com/cosmos/bank/v1beta1/balances/${address}`,
    `https://api.sentinel.quokkastake.io/cosmos/bank/v1beta1/balances/${address}`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const balance = data.balances?.find(b => b.denom === 'udvpn');
        if (balance) {
          const amount = parseFloat(balance.amount) / 1000000;
          return amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DVPN';
        }
      }
    } catch (e) {
      // Ignore and try next URL
    }
  }
  return '0.00 DVPN';
}

async function getNodeInfo(moniker) {
  // Query Sentinel container's internal API port 8585 using Docker network DNS
  const url = `http://nodepin_sentinel_${moniker}:8585/info`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // API not responding or starting up
  }
  return null;
}

async function getMetrics() {
  const instances = [];

  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: ['com.nodepin.network=sentinel'] }
    });

    for (const c of containers) {
      const name = c.Names[0]?.replace('/', '') || '';
      const moniker = c.Labels['com.nodepin.moniker'] || name.replace('nodepin_sentinel_', '');
      const type = c.Labels['com.nodepin.type'] || 'wireguard';
      const ip = c.Labels['com.nodepin.ip'] || '0.0.0.0';
      const port = c.Labels['com.nodepin.node_port'] || '';
      const proto = c.Labels['com.nodepin.proto'] || 'udp';

      // 1. Read wallet address from file
      let address = '';
      try {
        const addrPath = path.join('/app/data', `sentinel_${moniker}`, 'address.txt');
        if (fs.existsSync(addrPath)) {
          address = fs.readFileSync(addrPath, 'utf8').trim();
        }
      } catch (e) {
        // Address file not found or unreadable
      }

      // 2. Fetch live balance from Sentinel Blockchain
      let balance = '0.00 DVPN';
      if (address) {
        balance = await getWalletBalance(address);
      }

      // 3. Query local Sentinel Node API for peers / details
      let activePeers = 0;
      let nodeVersion = 'N/A';
      let nodeStatus = c.State === 'running' ? 'ok' : 'stopped';

      if (c.State === 'running') {
        const info = await getNodeInfo(moniker);
        if (info) {
          // Parse peers if available in info response
          activePeers = info.peers || info.result?.peers || 0;
          nodeVersion = info.version || info.result?.version || 'N/A';
        } else {
          // Node is running but API is not responding (could be starting up or registering)
          nodeStatus = 'starting';
        }
      }

      instances.push({
        network: 'sentinel',
        moniker: moniker.toUpperCase(),
        token: 'DVPN',
        status: nodeStatus,
        earnings: null, // we display balance instead of earnings for now
        extra: {
          'النوع (Type)': type.toUpperCase(),
          'الآي بي (IP)': ip,
          'المنفذ (Port)': `${port}/${proto.toUpperCase()}`,
          'المحفظة (Wallet)': address || 'N/A',
          'الرصيد (Balance)': balance,
          'المتصلين (Peers)': activePeers,
          'الإصدار (Version)': nodeVersion
        }
      });
    }
  } catch (err) {
    // If docker query fails, return empty list
  }

  return instances;
}

module.exports = { network: 'sentinel', getMetrics };
