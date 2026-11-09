import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright,expect
OUT=Path('/tmp/browser/t55');shots=OUT/'screenshots';shots.mkdir(exist_ok=True)
async def capture(loc,name):
 await loc.scroll_into_view_if_needed();await loc.screenshot(path=str(shots/(name+'.png')))
async def main():
 results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for width in [1280,390]:
   ctx=await b.new_context(viewport={'width':width,'height':1800});page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080',wait_until='networkidle');await page.locator('article[data-deal-id]').first.wait_for()
   data=await page.evaluate('''async()=>{const {getDeals}=await import('/src/lib/deals.functions.ts'); const {intakeAudit}=await import('/src/lib/deal-intake.ts'); const {propertyReview}=await import('/src/lib/property-review.ts');const data=await getDeals({data:{refresh:true}});return {ids:data.deals.map(d=>d.id),audit:data.deals.map(d=>({id:d.id,address:d.address,...intakeAudit(data.analyses[d.id]),review:propertyReview(d.id),listing:{price:d.displayPrice,sqft:d.cells.sqft,beds:d.cells.current_beds,baths:d.cells.current_baths}}))}}''')
   await capture(page.locator('main'),'home-'+str(width))
   for id in data['ids']:
    card=page.locator(f'article[data-deal-id="{id}"]');base=next(a for a in data['audit'] if a['id']==id);baseCount=base['roomCount'];baseRent=base['grossRent']
    await card.get_by_role('button',name='Next photo',exact=True).click();assert page.url.endswith('/')
    await card.focus();await page.keyboard.press('Enter');await page.get_by_role('heading',name='Numbers overview').wait_for()
    await page.wait_for_timeout(500)
    overview=page.locator('main > section').first
    await capture(overview,id+'-summary-'+str(width))
    rents=page.locator('input[aria-label$=" rent"]');assert await rents.count()==baseCount
    assert await page.get_by_label('Maintenance / security / mo $',exact=True).input_value()=='150'
    assert 'padsplit' not in (await page.locator('body').inner_text()).lower()
    header=page.locator('header');oldheader=await header.inner_text();await page.get_by_label('Purchase price $',exact=True).fill('123456');assert await header.inner_text()==oldheader
    await page.get_by_role('button',name='Reset to original').click()
    await rents.last.fill('901')
    edited=await rents.last.input_value();await page.get_by_role('link',name='All deals',exact=True).click();await card.wait_for()
    expected=baseRent-base['rooms'][-1]['rent']+901
    assert f'${expected:,.0f}' in await card.inner_text()
    await card.focus();await page.keyboard.press('Enter');await page.get_by_role('heading',name='Numbers overview').wait_for();assert await rents.last.input_value()==edited
    await page.get_by_role('button',name='Reset to original').click();assert await rents.count()==baseCount;assert await rents.last.input_value()==str(base['rooms'][-1]['rent'])
    for n in range(baseCount,16):await page.get_by_role('button',name='Add room',exact=True).click()
    assert await rents.count()==16;assert await page.get_by_role('button',name='Add room',exact=True).is_disabled();await rents.last.fill('-5');assert await rents.last.get_attribute('aria-invalid')=='true';assert 'Rent must be 0 or greater' in await page.locator('body').inner_text()
    await page.get_by_role('button',name='Reset to original').click()
    controls=page.get_by_role('button',name='Show explanation',exact=True);assert await controls.count()>0
    for control in await controls.all():assert await control.get_attribute('aria-expanded')=='false'
    for title in ['Main and upper levels' if id=='6' else 'Main level','Basement level']:
     section=page.locator('section').filter(has=page.get_by_role('heading',name=title,exact=True));await section.scroll_into_view_if_needed()
     imgs=section.locator('img');dimensions=[]
     for im in await imgs.all():
      await im.evaluate('(i)=>i.decode()');dimensions.append(await im.evaluate('(i)=>[i.naturalWidth,i.naturalHeight]'))
     await capture(section,id+'-'+('basement' if title=='Basement level' else 'main')+'-'+str(width))
     control=section.get_by_role('button',name='Show explanation',exact=True);await control.focus();await page.keyboard.press('Enter');assert await section.get_by_role('button',name='Hide explanation').get_attribute('aria-expanded')=='true';await page.keyboard.press('Space');assert await section.get_by_role('button',name='Show explanation').get_attribute('aria-expanded')=='false'
    parking=page.locator('section').filter(has=page.get_by_role('heading',name='Parking',exact=True));await parking.locator('img').evaluate('(i)=>i.decode()');await capture(parking,id+'-parking-'+str(width))
    assert await page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),id+' overflow'
    results.append({'width':width,'id':id,'defaultReset':baseCount,'grossRent':baseRent,'editHomeBack':True,'max16':True,'negativeGuard':True,'keyboard':True,'errors':list(errors)})
    await page.get_by_role('link',name='All deals',exact=True).click();await page.locator('article[data-deal-id]').first.wait_for()
   if width==1280:
    await page.locator('.leaflet-marker-icon').first.wait_for();await page.locator(f'.leaflet-marker-icon[data-deal-id="{data["ids"][-1]}"]').click();await page.get_by_role('heading',name='Numbers overview').wait_for();assert page.url.endswith('/deal/'+data['ids'][-1])
   await ctx.close()
  OUT.joinpath('site-audit.json').write_text(json.dumps({'eligibleIds':data['ids'],'count':len(data['ids']),'properties':data['audit'],'browser':results,'hosted':'Not checked; local preview only'},indent=2));print(json.dumps(results));await b.close()
asyncio.run(main())
