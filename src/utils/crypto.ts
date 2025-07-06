import bcrypt from 'bcryptjs';

// Web Crypto API를 사용한 암호화 유틸리티

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10); // 10 rounds salt
}

// 비밀번호 검증
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

// JWT 토큰 생성
export async function generateJwtToken(payload: any, secret: string, expiresIn: number = 3600): Promise<string> {
    const header = {
        alg: 'HS256',
        typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        ...payload,
        iat: now,
        exp: now + expiresIn,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));

    const signature = await createSignature(`${encodedHeader}.${encodedPayload}`, secret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// JWT 토큰 검증
export async function verifyJwtToken(token: string, secret: string): Promise<any> {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // 서명 검증
    const expectedSignature = await createSignature(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
    }

    // 페이로드 디코딩
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // 만료 시간 확인
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
    }

    return payload;
}

// Base64 URL 인코딩
function base64UrlEncode(str: string): string {
    const base64 = base64Encode(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Base64 URL 디코딩
function base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return base64Decode(str);
}

// Base64 인코딩 (Cloudflare Workers 환경에서 안전)
function base64Encode(str: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const base64 = btoa(String.fromCharCode(...data));
    return base64;
}

// Base64 디코딩 (Cloudflare Workers 환경에서 안전)
function base64Decode(str: string): string {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

// HMAC 서명 생성
async function createSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureHex = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return base64UrlEncode(signatureHex);
}
