import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright,expect
OUT=Path('/tmp/browser/revision-nov7'); results=[]
async def capture(loc,name):
 await loc.scroll_into_view_if_needed();await loc.screenshot(path=str(OUT/(name+'.png')))
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for width in [1280,390]:
   ctx=await b.new_context(viewport={'width':width,'height':1800});page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   for id in ['6','8','40']:
    await page.goto('http://localhost:8080');card=page.locator(f'article[data-deal-id="{id}"]');await card.wait_for();await page.wait_for_timeout(1000);await card.hover()
    if width==1280 and id=='40':
     await page.locator('.leaflet-marker-icon').first.wait_for();await page.wait_for_timeout(1500);await page.screenshot(path=str(OUT/'home-desktop-hover.png'))
    region=card.get_by_role('region');await region.get_by_role('button',name='Next photo',exact=True).click();assert page.url=='http://localhost:8080/'
    await region.get_by_role('button',name='Show photo 3',exact=True).click();assert page.url=='http://localhost:8080/'
    await region.focus();await page.keyboard.press('ArrowRight');assert page.url=='http://localhost:8080/'
    bounds=await region.bounding_box();await page.mouse.move(bounds['x']+bounds['width']*.75,bounds['y']+bounds['height']*.3);await page.mouse.down();await page.mouse.move(bounds['x']+bounds['width']*.2,bounds['y']+bounds['height']*.3,steps=12);await page.mouse.up();assert page.url=='http://localhost:8080/'
    assert await region.locator('.carousel-photo-picker').evaluate('(e)=>getComputedStyle(e).scrollbarWidth')=='none'
    # Verify photo link and metrics independently, then padding path.
    await card.locator('[aria-hidden="false"] a').click();await page.get_by_role('heading',name='Numbers overview').wait_for();assert page.url.endswith('/deal/'+id)
    await page.goto('http://localhost:8080');await card.wait_for();await page.wait_for_timeout(1000);await card.locator('dl').click();await page.get_by_role('heading',name='Numbers overview').wait_for();assert page.url.endswith('/deal/'+id)
    await page.goto('http://localhost:8080');await card.wait_for();await page.wait_for_timeout(1000)
    # padding, metrics and keyboard paths
    await card.click(position={'x':card.bounding_box and 3,'y':3});await page.get_by_role('heading',name='Numbers overview').wait_for();assert page.url.endswith('/deal/'+id)
    assert await page.locator('main>section').first.get_by_role('heading',name='Numbers overview').count()==1
    assert await page.get_by_text('Underwriting provenance',exact=True).count()==0
    await page.wait_for_timeout(1000)
    rents=page.locator('input[aria-label$=" rent"]');assert await rents.count()==10
    if id=='40':assert await rents.first.input_value()=='830'
    for n in range(11,17):
     await page.get_by_role('button',name='Add room',exact=True).click();await expect(rents).to_have_count(n)
    await expect(rents).to_have_count(16);assert await page.get_by_role("button",name="Add room",exact=True).is_disabled()
    if id=='40' and width==390:await capture(page.get_by_role('region',name='Edit analysis'),'elmira-mobile-editor16')
    await rents.first.fill('-5');assert await rents.first.get_attribute('aria-invalid')=='true'
    await page.get_by_role('button',name='Reset to original').click();assert await rents.count()==10
    hero=page.get_by_role('region').first
    if id=='40':
     for n in range(1,31):
      await hero.get_by_role('button',name=f'Show photo {n}',exact=True).click()
      image=hero.locator('[aria-hidden="false"] img');await image.evaluate('(i)=>i.decode()');assert await image.evaluate('(i)=>i.naturalWidth')==1600
     await hero.get_by_role('button',name='Show photo 1',exact=True).click()
     await capture(hero,'elmira-repaired-hero' if width==1280 else 'elmira-mobile-carousel')
    park=page.locator('section').filter(has=page.get_by_role('heading',name='Parking',exact=True));img=park.locator('.parking-aerial-frame>img');await img.evaluate('(i)=>i.decode()');box=await img.bounding_box();assert abs(box['width']/box['height']-1920/1072)<.02
    await capture(park,f'{id}-parking'+('' if width==1280 else '-mobile'))
    if id=='40' and width==1280:
     for title,name in [('Main level','elmira-main-before-after'),('Basement level','elmira-basement-before-after')]:
      loc=page.locator('section').filter(has=page.get_by_role('heading',name=title,exact=True));await capture(loc,name)
    await page.goto('http://localhost:8080');card=page.locator(f'article[data-deal-id="{id}"]');await card.wait_for();await page.wait_for_timeout(1000);await card.focus();await page.keyboard.press('Enter');await page.get_by_role('heading',name='Numbers overview').wait_for();assert page.url.endswith('/deal/'+id)
    await page.goto('http://localhost:8080');await page.locator(f'[data-deal-id="{id}"].leaflet-marker-icon').click();await page.get_by_role('heading',name='Numbers overview').wait_for();assert page.url.endswith('/deal/'+id)
    results.append({'width':width,'id':id,'gallery_decode':30 if id=='40' else 'controls checked','count_reset':10,'max':16,'parking_ratio':box['width']/box['height'],'errors':errors})
   await ctx.close()
  await b.close()
 OUT.joinpath('results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))
asyncio.run(main())
