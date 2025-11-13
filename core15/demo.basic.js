// demo.basic.js — core15 için basit başlatıcı
// Not: Bu sadece örnek; gerçek projede kendi main.js'inizde benzer akışı kullanabilirsiniz.

import { Tapp } from './Tapp.js';

// DOM tamamen yüklendiğinde uygulamayı başlat
if (typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', () => {
    // Kullanıcı hiçbir şey vermezse bile config.CORE_DEFAULTS devreye girer.
    // Burada sadece birkaç tipik ayarı override ediyoruz.
    Tapp.boot({
      // Profil: 'editor' = tam etkileşimli, 'viewer' = readonly
      profile: 'editor',

      // Sahne ayarları — mountEl DOM'da yoksa TappSetup.ensureRoot
      // config.CORE_DEFAULTS.scene.root'a göre otomatik bir div oluşturup body'ye ekler.
      scene: {
        mountEl: '#stage',                // yoksa otomatik oluşturulur
        root: { tag: 'div', class: 'tapp-root' }
      },

      // History / serializer / selection / interact hepsi bir seferde
      history: {
        enabled: true,
        limit: 500
      },

      serializer: {
        mode: 'min'
      },

      selection: {
        mode: 'multiple'
      },

      interact: {
        overlayMode: 'root',
        attach: 'overlay',
        move:   { bound:true, xable:true, yable:true },
        resize: { pad:6, minW:20, minH:20 }
        // drag / snap / keys gibi ek alanlar da buraya eklenebilir
      }
    }).then(app => {
      // Debug için global atama (isteğe bağlı)
      if (typeof window !== 'undefined'){
        window.app = app;
      }
    }).catch(err => {
      // Demo ortamında sadece konsola loglamak yeterli
      console.error('Tapp boot error:', err);
    });
  });
}
