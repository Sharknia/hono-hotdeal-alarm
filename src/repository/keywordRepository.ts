import { createClient } from '@supabase/supabase-js';
import { Keyword, KeywordSite, SiteName, UserKeyword } from '../types/keyword';

// Supabase 클라이언트 생성 함수
function createSupabaseClient(supabaseUrl: string, supabaseKey: string, isServiceRole: boolean = false) {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
        db: {
            schema: 'public',
        },
    });
}

// 키워드 제목으로 키워드 조회
export async function getKeywordByTitle(supabaseUrl: string, supabaseAnonKey: string, title: string): Promise<Keyword | null> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('hotdeal_keywords').select('*').eq('title', title).single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // 데이터가 없을 때
        }
        console.error('Error fetching keyword by title:', error);
        throw new Error('키워드 조회에 실패했습니다.');
    }

    return data;
}

// 키워드 생성
export async function createKeyword(supabaseUrl: string, supabaseServiceRoleKey: string, title: string): Promise<Keyword> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, true);

    const { data, error } = await supabase
        .from('hotdeal_keywords')
        .insert({
            title: title,
            wdate: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating keyword:', error);
        throw new Error('키워드 생성에 실패했습니다.');
    }

    return data;
}

// 사용자의 키워드 개수 조회
export async function getMyKeywordCount(supabaseUrl: string, supabaseAnonKey: string, userId: string): Promise<number> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { count, error } = await supabase.from('user_keywords').select('*', { count: 'exact', head: true }).eq('user_id', userId);

    if (error) {
        console.error('Error fetching user keyword count:', error);
        throw new Error('사용자 키워드 개수 조회에 실패했습니다.');
    }

    return count || 0;
}

// 사용자에게 키워드 연결
export async function addMyKeyword(supabaseUrl: string, supabaseServiceRoleKey: string, userId: string, keywordId: number): Promise<UserKeyword> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, true);

    const { data, error } = await supabase
        .from('user_keywords')
        .insert({
            user_id: userId,
            keyword_id: keywordId,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding user keyword:', error);
        if (error.code === '23505') {
            // 중복 키 에러
            throw new Error('이미 등록된 키워드입니다.');
        }
        throw new Error('키워드 등록에 실패했습니다.');
    }

    return data;
}

// 사용자가 특정 키워드를 소유하고 있는지 확인
export async function isMyKeyword(supabaseUrl: string, supabaseAnonKey: string, userId: string, keywordId: number): Promise<boolean> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('user_keywords').select('keyword_id').eq('user_id', userId).eq('keyword_id', keywordId).single();

    if (error) {
        if (error.code === 'PGRST116') {
            return false; // 데이터가 없을 때
        }
        console.error('Error checking user keyword:', error);
        throw new Error('키워드 소유 확인에 실패했습니다.');
    }

    return data !== null;
}

// 사용자와 키워드 연결 해제
export async function unlinkUserKeyword(supabaseUrl: string, supabaseServiceRoleKey: string, userId: string, keywordId: number): Promise<void> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, true);

    const { error } = await supabase.from('user_keywords').delete().eq('user_id', userId).eq('keyword_id', keywordId);

    if (error) {
        console.error('Error unlinking user keyword:', error);
        throw new Error('키워드 연결 해제에 실패했습니다.');
    }
}

// 키워드가 사용 중인지 확인 (다른 사용자가 소유하고 있는지)
export async function isKeywordUsed(supabaseUrl: string, supabaseAnonKey: string, keywordId: number): Promise<boolean> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { count, error } = await supabase.from('user_keywords').select('*', { count: 'exact', head: true }).eq('keyword_id', keywordId);

    if (error) {
        console.error('Error checking keyword usage:', error);
        throw new Error('키워드 사용 확인에 실패했습니다.');
    }

    return (count || 0) > 0;
}

// 키워드 삭제
export async function deleteKeyword(supabaseUrl: string, supabaseServiceRoleKey: string, keywordId: number): Promise<void> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, true);

    const { error } = await supabase.from('hotdeal_keywords').delete().eq('id', keywordId);

    if (error) {
        console.error('Error deleting keyword:', error);
        throw new Error('키워드 삭제에 실패했습니다.');
    }
}

// 사용자의 키워드 목록 조회
export async function selectUsersKeywords(supabaseUrl: string, supabaseAnonKey: string, userId: string): Promise<Keyword[]> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    // 1단계: 사용자의 키워드 ID 목록 가져오기
    const { data: userKeywords, error: userError } = await supabase.from('user_keywords').select('keyword_id').eq('user_id', userId);

    if (userError) {
        console.error('Error fetching user keywords:', userError);
        throw new Error('사용자 키워드 목록 조회에 실패했습니다.');
    }

    if (!userKeywords || userKeywords.length === 0) {
        return [];
    }

    // 2단계: 키워드 ID들로 실제 키워드 정보 가져오기
    const keywordIds = userKeywords.map((uk) => uk.keyword_id);
    const { data: keywords, error: keywordError } = await supabase.from('hotdeal_keywords').select('id, title, wdate').in('id', keywordIds);

    if (keywordError) {
        console.error('Error fetching keywords:', keywordError);
        throw new Error('키워드 정보 조회에 실패했습니다.');
    }

    return keywords || [];
}

// 키워드 사이트 정보 생성
export async function createKeywordSite(
    supabaseUrl: string,
    supabaseServiceRoleKey: string,
    keywordId: number,
    siteName: SiteName,
    externalId: string,
    link?: string,
    price?: string,
    metaData?: string
): Promise<KeywordSite> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, true);

    const { data, error } = await supabase
        .from('hotdeal_keyword_sites')
        .insert({
            keyword_id: keywordId,
            site_name: siteName,
            external_id: externalId,
            link,
            price,
            meta_data: metaData,
            wdate: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating keyword site:', error);
        throw new Error('키워드 사이트 정보 생성에 실패했습니다.');
    }

    return data;
}

// 키워드 사이트 정보 조회
export async function getKeywordSites(supabaseUrl: string, supabaseAnonKey: string, keywordId: number): Promise<KeywordSite[]> {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('hotdeal_keyword_sites').select('*').eq('keyword_id', keywordId);

    if (error) {
        console.error('Error fetching keyword sites:', error);
        throw new Error('키워드 사이트 정보 조회에 실패했습니다.');
    }

    return data || [];
}
