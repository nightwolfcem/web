
/**
 * TmenuManager: Uygulamadaki tüm Tmenu örneklerini yöneten singleton sınıf.
 * Dışarıya tıklandığında açık olan tüm menüleri kapatmaktan sorumludur.
 */
class TmenuManager {
    static #instance;
    
    constructor() {
        if (TmenuManager.#instance) {
            return TmenuManager.#instance;
        }
        this.openMenus = []; // Açık olan menüleri bir yığın gibi tutar
        window.addEventListener('mousedown', this.handleOutsideClick.bind(this), true);
        window.addEventListener('keydown', this.handleKeyboard.bind(this), true);
        TmenuManager.#instance = this;
    }

    /**
     * Yeni bir menü açıldığında onu kaydeder.
     * @param {Tmenu} menu - Açılan menü nesnesi.
     */
    register(menu) {
        if (!this.openMenus.includes(menu)) {
            this.openMenus.push(menu);
        }
    }

    /**
     * Bir menü kapandığında onu kayıtlardan çıkarır.
     * @param {Tmenu} menu - Kapanan menü nesnesi.
     */
    unregister(menu) {
        const index = this.openMenus.indexOf(menu);
        if (index > -1) {
            this.openMenus.splice(index, 1);
        }
    }
    
    /**
     * Belirli bir seviyeden daha derindeki tüm menüleri kapatır.
     * Alt menüler açıldığında, kardeş menüleri kapatmak için kullanılır.
     * @param {Tmenu} menu - Bu menü ve ebeveynleri açık kalacak.
     */
    closeSubsequentMenus(menu) {
        let level = -1;
        let parent = menu;
        while(parent) {
            level++;
            parent = parent.parentMenu;
        }

        const menusToClose = this.openMenus.filter(m => {
            let mLevel = -1;
            let mParent = m;
            while(mParent) {
                mLevel++;
                mParent = mParent.parentMenu;
            }
            return mLevel > level;
        });

        menusToClose.forEach(m => m.hide());
    }

    /**
     * Tüm açık menüleri kapatır.
     */
    closeAll() {
        // Yığının kopyası üzerinde işlem yap, çünkü hide() metodu unregister çağırarak orijinal yığını değiştirir.
        [...this.openMenus].forEach(menu => menu.hide());
    }

    /**
     * Herhangi bir menünün dışına tıklandığında tüm menüleri kapatır.
     */
    handleOutsideClick(event) {
        if (this.openMenus.length === 0) return;

        const isClickInsideAMenu = this.openMenus.some(menu => menu.htmlObject.contains(event.target));
        
        if (!isClickInsideAMenu) {
            this.closeAll();
        }
    }

    /**
     * Klavye olaylarını yönetir (örn: Escape tuşu ile kapatma).
     */
    handleKeyboard(event) {
        if (this.openMenus.length > 0 && event.key === 'Escape') {
            event.preventDefault();
            this.closeAll();
        }
    }

    /**
     * Singleton örneğini döndürür.
     */
    static getInstance() {
        return this.#instance || new TmenuManager();
    }
}

// Singleton örneğini oluştur ve dışa aktar.
export const menuManager = TmenuManager.getInstance();
window.TmenuManager = TmenuManager;