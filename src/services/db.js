import { supabase } from './supabase.js';

export const ARCHIVED_LIST_TITLE = '__archived__';

export async function createList(title, position) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('lists')
        .insert({
            user_id: user.id,
            title,
            position,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function fetchBoard(userId) {
    const [profileRes, listsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('lists').select('*').eq('user_id', userId).order('position'),
        supabase.from('tasks').select('*').eq('user_id', userId).order('position'),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (listsRes.error) throw listsRes.error;
    if (tasksRes.error) throw tasksRes.error;

    return {
        profile: profileRes.data,
        lists: listsRes.data,
        tasks: tasksRes.data,
    };
}

export async function createTask(listId, title, position) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('tasks')
        .insert({
            list_id: listId,
            user_id: user.id,
            title,
            position,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateTask(taskId, fields) {
    const { data, error } = await supabase
        .from('tasks')
        .update(fields)
        .eq('id', taskId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTask(taskId) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
}

export async function reorderTasks(listId, taskPositions) {
    const updates = taskPositions.map(({ id, position }) =>
        supabase.from('tasks').update({ position, list_id: listId }).eq('id', id)
    );

    const results = await Promise.all(updates);
    for (const res of results) {
        if (res.error) throw res.error;
    }
}

export async function reorderLists(listPositions) {
    const updates = listPositions.map(({ id, position }) =>
        supabase.from('lists').update({ position }).eq('id', id)
    );

    const results = await Promise.all(updates);
    for (const res of results) {
        if (res.error) throw res.error;
    }
}

export async function updateTheme(theme) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('profiles').update({ theme }).eq('id', user.id);

    if (error) throw error;
}
