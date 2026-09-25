// Configuración de la versión web de "A pan y verga".
// url y key: Supabase → Project Settings → API. La "anon" / "publishable" key es pública por diseño
// (viaja en el navegador de todos). NUNCA pongas aquí la service_role / secret key.
// ice: servidores para conectar voz, cámara y la pelea directo entre navegadores. Con los STUN de
// Google conecta en la mayoría de las casas; para redes difíciles agrega un TURN, por ejemplo:
//   ice: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:TU-SERVIDOR:3478', username: '...', credential: '...' }]
window.APYV_CONFIG = {
  url: 'https://bwgdnhdilaspyfwbmuhz.supabase.co',
  key: 'sb_publishable_746w0xlnShjOc6bMVp7e8w_L95WCvQN',
  ice: null,
};
