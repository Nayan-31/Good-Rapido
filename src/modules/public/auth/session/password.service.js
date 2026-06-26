import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export default class PasswordService {
    async hash(password) {
        const salt = randomBytes(16).toString('hex');
        const key = await scrypt(password, salt, KEY_LENGTH);

        return `scrypt$${salt}$${key.toString('hex')}`;
    }

    async compare(password, storedHash) {
        if (!storedHash) {
            return false;
        }

        const [algorithm, salt, hash] = storedHash.split('$');

        if (algorithm !== 'scrypt' || !salt || !hash) {
            return false;
        }

        const suppliedKey = await scrypt(password, salt, KEY_LENGTH);
        const storedKey = Buffer.from(hash, 'hex');

        if (storedKey.length !== suppliedKey.length) {
            return false;
        }

        return timingSafeEqual(storedKey, suppliedKey);
    }
}
