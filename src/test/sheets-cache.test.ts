import {afterEach,expect,it,vi} from 'vitest';
import {readDealsSheet} from '../lib/sheets.server';
afterEach(()=>vi.unstubAllGlobals());
it('coalesces concurrent GET reads and explicit Refresh bypasses60second cache',async()=>{
 const fetch=vi.fn(async()=>new Response(JSON.stringify({values:[['Deal ID'],['DEN-1']]}),{headers:{'content-type':'application/json'}}));
 vi.stubGlobal('fetch',fetch);vi.stubEnv('LOVABLE_API_KEY','test-only');vi.stubEnv('GOOGLE_SHEETS_API_KEY','test-only');
 await Promise.all([readDealsSheet(),readDealsSheet()]);expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0]?.length).toBe(2);
 await readDealsSheet();expect(fetch).toHaveBeenCalledTimes(1);await readDealsSheet(true);expect(fetch).toHaveBeenCalledTimes(2);vi.unstubAllEnvs();
});
