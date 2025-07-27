/**
 * Command (Komut) Tasarım Deseni için temel sınıf.
 * Geri alınabilir tüm işlemler bu sınıftan türemelidir.
 */
export class Tcommand {
    /**
     * @param {string} name - Komutun adı (geçmiş listelerinde görünmesi için).
     */
    constructor(name) {
        this.name = name;
        if (this.constructor === Tcommand) {
            throw new Error("Abstract class 'Command' cannot be instantiated directly.");
        }
    }
    /**
     * Komutu çalıştırır.
     */
    do() {
        throw new Error("Method 'do()' must be implemented by subclass.");
    }

    /**
     * Komutun etkisini geri alır.
     */
    undo() {
        throw new Error("Method 'undo()' must be implemented by subclass.");
    }

    /**
     * Komutu yeniden uygular. Genellikle 'do' ile aynıdır.
     */
    redo() {
        this.do();
    }
}
