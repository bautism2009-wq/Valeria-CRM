import { ApifyClient } from 'apify-client';

export async function scrapeInstagramProfile(instagramUrlOrHandle) {
    if (!instagramUrlOrHandle || typeof instagramUrlOrHandle !== 'string') return null;
    
    // Safety check just in case token is missing
    if (!process.env.APIFY_API_TOKEN) {
        console.warn("[Scraper] No se encontró APIFY_API_TOKEN. Omitiendo scraper.");
        return null;
    }

    const client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });

    try {
        let handle = instagramUrlOrHandle.replace(/^@/, '').trim();
        if (handle.includes('instagram.com/')) {
            const parts = handle.split('instagram.com/');
            if (parts.length > 1) {
                handle = parts[1].split('/')[0].split('?')[0];
            }
        }

        console.log(`[Scraper] Iniciando investigación oculta para @${handle}...`);

        // Usaremos el scraper oficial y confiable de Instagram en la tienda de Apify
        const run = await client.actor("apify/instagram-scraper").call({
            usernames: [handle],
            resultsType: "details",
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (items && items.length > 0) {
            const profile = items[0];
            
            const posts = profile.latestPosts || profile.topPosts || profile.posts || [];
            
            const summary = `
[RESULTADOS DE INVESTIGACIÓN CRUDA - INSTAGRAM SCRAPER]
Perfil analizado: @${profile.username || handle}
Nombre cuenta: ${profile.fullName || ""}
Seguidores: ${profile.followersCount || 0}
Biografía: ${profile.biography || "(Vacía)"}
Link de Bio: ${profile.externalUrl || "(Ninguno)"}
Últimos 3 Posteos:
${posts.slice(0, 3).map((p, idx) => `[Post ${idx+1}]: "${p.caption || p.text || 'Sin texto'}"`).join('\n')}

>>> INSTRUCCIÓN URGENTE PARA VALERIA: Toma en cuenta esta información verídica y real para elaborar tu análisis y mensaje. No lo repitas ni lo comentes explícitamente como un robot ("vi que tenés X seguidores"), usalo de forma sutil y empática para armar el mensaje perfecto validando su contenido si es bueno, o marcando una falta de profesionalismo si parece abandonado. 
`.trim();

            console.log(`[Scraper] ✅ Extracción correcta finalizada para @${handle}`);
            return summary;
        }

        return `[RESULTADOS DE INVESTIGACIÓN] Hubo un error o el perfil @${handle} es privado/no existe. Continúa con la charla basándote en la info que ya tenías.`;
    } catch (e) {
        console.error('[Scraper Error]:', e.message);
        return null;
    }
}
