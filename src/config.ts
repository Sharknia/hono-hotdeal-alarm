// 환경변수 설정 관리
export interface AppConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceRoleKey: string;
    jwtSecret: string;
}

let config: AppConfig | null = null;

// 환경변수 초기화 (앱 시작 시 한 번만 호출)
export async function initializeConfig(env: {
    SUPABASE_URL: { get(): Promise<string> };
    SUPABASE_ANON_KEY: { get(): Promise<string> };
    SUPABASE_SERVICE_ROLE_KEY: { get(): Promise<string> };
    JWT_SECRET: { get(): Promise<string> };
}): Promise<void> {
    if (config) {
        return; // 이미 초기화됨
    }

    try {
        config = {
            supabaseUrl: await env.SUPABASE_URL.get(),
            supabaseAnonKey: await env.SUPABASE_ANON_KEY.get(),
            supabaseServiceRoleKey: await env.SUPABASE_SERVICE_ROLE_KEY.get(),
            jwtSecret: await env.JWT_SECRET.get(),
        };
    } catch (error) {
        console.error('환경변수 초기화 실패:', error);
        throw new Error('Failed to initialize environment variables');
    }
}

// 초기화된 설정 가져오기
export function getConfig(): AppConfig {
    if (!config) {
        throw new Error('Configuration not initialized. Call initializeConfig() first.');
    }
    return config;
}

// 설정 초기화 상태 확인
export function isConfigInitialized(): boolean {
    return config !== null;
}
