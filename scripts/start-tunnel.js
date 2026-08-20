const localtunnel = require('localtunnel');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 8081 });
    console.log(`\n=============================================`);
    console.log(`🚀 PERSISTENT TUNNEL READY:`);
    console.log(`URL: ${tunnel.url}`);
    console.log(`Expo Link: exp://${tunnel.url.replace('https://', '')}`);
    console.log(`=============================================\n`);

    tunnel.on('close', () => {
      console.log('Tunnel closed.');
    });
  } catch (err) {
    console.error('Localtunnel error:', err);
  }
})();
