import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthEnv, User, UserCreateRequest } from '../types/auth';

export class UserRepository {
    private supabase: SupabaseClient;

    constructor(env: AuthEnv) {
        this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    }

    // 이메일로 사용자 조회
    async findByEmail(email: string): Promise<User | null> {
        const { data, error } = await this.supabase.from('users').select('*').eq('email', email).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 레코드가 없는 경우
                return null;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // ID로 사용자 조회
    async findById(id: string): Promise<User | null> {
        const { data, error } = await this.supabase.from('users').select('*').eq('id', id).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 레코드가 없는 경우
                return null;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // 사용자 생성
    async create(userData: UserCreateRequest & { hashedPassword: string }): Promise<User> {
        const { data, error } = await this.supabase
            .from('users')
            .insert([
                {
                    email: userData.email,
                    nickname: userData.nickname,
                    hashed_password: userData.hashedPassword,
                    auth_level: 1, // USER 레벨
                    is_active: true,
                },
            ])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                // 유니크 제약 조건 위반
                throw new Error('Email already registered');
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // 리프레시 토큰 업데이트
    async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
        const { error } = await this.supabase.from('users').update({ refresh_token: refreshToken }).eq('id', userId);

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }
    }

    // 리프레시 토큰으로 사용자 조회
    async findByRefreshToken(refreshToken: string): Promise<User | null> {
        const { data, error } = await this.supabase.from('users').select('*').eq('refresh_token', refreshToken).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 레코드가 없는 경우
                return null;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // 사용자 활성화 상태 업데이트
    async updateActiveStatus(userId: string, isActive: boolean): Promise<void> {
        const { error } = await this.supabase.from('users').update({ is_active: isActive }).eq('id', userId);

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }
    }

    // 닉네임으로 사용자 조회 (중복 확인용)
    async findByNickname(nickname: string): Promise<User | null> {
        const { data, error } = await this.supabase.from('users').select('*').eq('nickname', nickname).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 레코드가 없는 경우
                return null;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }
}
