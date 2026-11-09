"""Local rendering checks; these do not assert hosted-preview verification."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width':1280,'height':1800})
        output = Path('/tmp/browser/elmira-repaired')
        for size in [{'width':1280,'height':1800}, {'width':390,'height':844}]:
            await page.set_viewport_size(size)
            for deal in ['6','8','40']:
                await page.goto(f'http://localhost:8080/deal/{deal}',wait_until='networkidle')
                frame=page.locator(f'[data-parking-aerial="{deal}"]')
                await frame.scroll_into_view_if_needed()
                image=frame.locator('img')
                bounds=await image.bounding_box(); box=await frame.bounding_box()
                assert bounds and box
                assert abs(bounds['width']/bounds['height']-1920/1072)<.01
                assert abs(box['height']-bounds['height'])<1
                for car in await frame.locator('svg').all():
                    carbox=await car.bounding_box();assert carbox
                    cx=carbox['x']+carbox['width']/2;cy=carbox['y']+carbox['height']/2
                    assert bounds['x']<cx<bounds['x']+bounds['width']
                    assert bounds['y']<cy<bounds['y']+bounds['height']
                suffix='desktop' if size['width']==1280 else 'mobile'
                await frame.locator('..').screenshot(path=str(output/f'{deal}-parking-{suffix}.png'))
                print('aerial rendered ratio/frame/cars pass',deal,suffix,bounds['height'])
            if size['width']==1280:
                plans=page.locator('main section').filter(has=page.get_by_role('heading',name='Main level',exact=True))
                assert await plans.locator('span.absolute').count()==0
                assert await plans.get_by_text('Original annotated drawing · Drive provenance').count()==1
                basement=page.locator('main section').filter(has=page.get_by_role('heading',name='Basement level',exact=True))
                images=await basement.locator('img').evaluate_all('(xs)=>xs.map(x=>x.src)')
                assert len(images)==2 and images[0]==images[1]
                assert await basement.locator('span.absolute').count()==0
                assert await page.get_by_text('Research/report claimed 8 spaces (unverified).',exact=False).count()==1
                provenance=page.get_by_label('Underwriting provenance')
                assert 'PROVISIONAL' in await provenance.inner_text()
                assert '-$740.91/mo' in await provenance.inner_text()
                await provenance.screenshot(path=str(output/'elmira-incomplete-financials.png'))
            rent=page.locator('input[aria-label$=" rent"]').first
            original=await rent.input_value()
            await rent.fill('-5');assert await rent.input_value()=='-5'
            assert await rent.get_attribute('aria-invalid')=='true'
            await page.get_by_role('alert').wait_for()
            await rent.scroll_into_view_if_needed()
            await rent.locator('..').screenshot(path=str(output/f'elmira-negative-rent-{suffix}.png'))
            await page.get_by_role('button',name='Reset to original').click()
            assert await rent.input_value()==original
            assert await page.get_by_role('alert').count()==0
        await browser.close()

asyncio.run(main())
