import { expect, it } from 'vitest';
import { planEvidence, wallDoorAllowance } from '../lib/plan-evidence';
it('uses the deterministic redline concept on the authentic current main with original provenance retained',()=>{
 const main=planEvidence('1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u','main','40');
 expect(main.afterAssetUrl).toContain('elmira-main-windows-t52.png');
 expect(main.afterProvenanceUrl).toContain('1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u');
 expect(main.suppressOverlays).toBe(true);
 expect(main.afterLabel).toContain('conceptual redline');
});
it('shows Grove before and after at matched building-core scale with provenance links kept',()=>{
 const main=planEvidence('1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS','main','8');
 const basement=planEvidence('1ng4zlQlQkPASHHg6E-qJL7UyNclRXEaE','basement','8');
 expect(main.beforeAssetUrl).toContain('grove-before-main-matched.png');
 expect(main.afterAssetUrl).toContain('grove-after-main-matched.png');
 expect(basement.beforeAssetUrl).toContain('grove-before-basement-matched.png');
 expect(basement.afterAssetUrl).toContain('grove-after-basement-matched.png');
 expect(main.afterProvenanceUrl).toContain('1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS');
 expect(main.beforeUrl).toContain('media.zillowmediaexperts.com');
});
it('uses the deterministic redline concept on the authentic current basement with original provenance retained',()=>{
 const basement=planEvidence('17Eyw1NrFHoZXM6tV8NAQnf9AqZOId8Tw','basement','40');
 expect(basement.afterAssetUrl).toContain('elmira-basement-windows-t52.png');
 expect(basement.beforeAssetUrl).toContain('elmira-current-basement-authentic.png');
 expect(basement.suppressOverlays).toBe(true);
 expect(basement.afterProvenanceUrl).toContain('17Eyw1NrFHoZXM6tV8NAQnf9AqZOId8Tw');
 expect(basement.afterLabel).toContain('conceptual redline');
 expect(basement.note).toContain('Conceptual layout; verify before construction.');
 expect(basement.note).toContain('bedroom pass-through');
});
 it('documents Elmira basement room 8 off the common route with the second enclosure dropped to keep the route open',()=>{
 const audit=planEvidence('17Eyw1NrFHoZXM6tV8NAQnf9AqZOId8Tw','basement','40').accessAudit ?? [];
 expect(audit.some(l=>l.includes('Room 7')&&l.includes('existing bedroom'))).toBe(true);
 expect(audit.some(l=>l.includes('Room 8')&&l.includes('common hall'))).toBe(true);
 expect(audit.some(l=>l.includes('Room 11')&&l.includes('common hall'))).toBe(true);
 expect(audit.some(l=>l.toLowerCase().includes('no bedroom pass-through'))).toBe(true);
 expect(audit.some(l=>l.includes('Egress')&&l.includes('not verified'))).toBe(true);
});
it('numbers Elmira concept bedrooms sequentially 1–8 with explicit source pin mapping and honest count vs 9 planned / 10 modeled',()=>{
 const audit=planEvidence('1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u','main','40').accessAudit ?? [];
 expect(audit.some(l=>l.includes('1–11')&&l.includes('5=7 family west')&&l.includes('8/9=10 basement west split'))).toBe(true);
 expect(audit.some(l=>l.includes('11 physical concept bedrooms')&&l.includes('9 source-planned')&&l.includes('10 modeled'))).toBe(true);
 expect(audit.some(l=>l.includes('source pins 5–6')&&l.includes('not counted as bedrooms'))).toBe(true);
});
it('estimates only Fraser main dining conversion room 1 at 3000, not existing upper rooms',()=>{
 expect(wallDoorAllowance('1BgaackKdZ4aXywzG4D4uFv3FSmY_V9GE','main','6')).toEqual({rooms:[1],unitRate:3000,amount:3000});
});
it('estimates Fraser basement converted rooms 7 and 8 at 6000',()=>{
 expect(wallDoorAllowance('1DRH3TUnIqc66SeRfMYBsZQKW4RzGT-OI','basement','6')).toEqual({rooms:[7,8],unitRate:3000,amount:6000});
});
it('estimates Grove main converted room 1 at 3000',()=>{
 expect(wallDoorAllowance('1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS','main','8')).toEqual({rooms:[1],unitRate:3000,amount:3000});
});
it('estimates Grove basement converted room 5 at 3000',()=>{
 expect(wallDoorAllowance('1ng4zlQlQkPASHHg6E-qJL7UyNclRXEaE','basement','8')).toEqual({rooms:[5],unitRate:3000,amount:3000});
});
it('suppresses app overlay pins on Fraser and Grove after drawings so authentic red annotations stay visible',()=>{
 expect(planEvidence('1BgaackKdZ4aXywzG4D4uFv3FSmY_V9GE','main','6').suppressOverlays).toBe(true);
 expect(planEvidence('1DRH3TUnIqc66SeRfMYBsZQKW4RzGT-OI','basement','6').suppressOverlays).toBe(true);
 expect(planEvidence('1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS','main','8').suppressOverlays).toBe(true);
 expect(planEvidence('1ng4zlQlQkPASHHg6E-qJL7UyNclRXEaE','basement','8').suppressOverlays).toBe(true);
});
it('labels Elmira main concept accurately and flags room 8 access as unverified',()=>{
 const basement=planEvidence('17Eyw1NrFHoZXM6tV8NAQnf9AqZOId8Tw','basement','40');
 expect(basement.afterLabel).toContain('conceptual redline');
 const main=planEvidence('1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u','main','40');
 expect(main.accessAudit?.some(l=>l.includes('Room 6')&&l.toLowerCase().includes('no bedroom pass-through'))).toBe(true);
 expect(main.accessAudit?.some(l=>l.includes('not converted'))).toBe(true);
 expect(main.note).toContain('Conceptual layout; verify before construction.');
 // Old source pin badges are never shown as current room numbers; source mapping lives in the access audit disclosure.
 expect(main.legendStatus).toBeNull();
 expect(basement.legendStatus).toBeNull();
 expect(planEvidence('1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS','main','8').legendStatus).toBeNull();
 // Concise visible truth line: 8 physical bedrooms shown, calculator models 10.
 expect(main.summary).toContain('11 concept bedrooms shown');
 expect(main.summary).toContain('calculator models 10');
 expect(basement.summary).toContain('11 concept bedrooms total');
 expect(main.accessAudit?.some(l=>l.includes('Source pin mapping'))).toBe(true);
});
it('provides a room-by-room access audit for every deal level',()=>{
 for(const [id,raw] of [['6','1BgaackKdZ4aXywzG4D4uFv3FSmY_V9GE'],['6','1DRH3TUnIqc66SeRfMYBsZQKW4RzGT-OI'],['8','1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS'],['8','1ng4zlQlQkPASHHg6E-qJL7UyNclRXEaE'],['40','1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u'],['40','17Eyw1NrFHoZXM6tV8NAQnf9AqZOId8Tw']] as const){
  const level=raw==='1BgaackKdZ4aXywzG4D4uFv3FSmY_V9GE'||raw==='1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS'||raw==='1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u'?'main':'basement';
  expect(planEvidence(raw,level,id).accessAudit?.length).toBeGreaterThan(0);
 }
});
it('never assigns level estimates to mismatched property or drawing identities',()=>{
 expect(wallDoorAllowance('1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS','basement','8')).toBeNull();
 expect(wallDoorAllowance('1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS','main','6')).toBeNull();
 expect(wallDoorAllowance('unknown','main','8')).toBeNull();
});
