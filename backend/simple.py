import asyncio
from dotenv import load_dotenv
load_dotenv()
from browser_use import Agent
from browser_use.llm import ChatOpenAI
from browser_use.browser.profile import BrowserProfile

async def main():
    agent = Agent(
        task="""Go to https://www.farmaciasguadalajara.com/ and find facturacion page and facturate this receipt, my details are RFC: DOGJ8603192W3

Email: jji@gmail.com
Company Name: JORGE DOMENZAIN GALINDO
Country: Mexico
Street: PRIV DEL MARQUEZ
Exterior Number: 404
Interior Number: 4
Colony: LOMAS 4A SECCION
Municipality: San Luis Potosí
Zip Code: 78216
State: San Luis Potosí

ID ticket: 470130640933843407
Folio: 97699
Transaction date: 09/05/2025
total: 128.0

Dont need to use all the details, just the ones that are necessary.


""",
        llm=ChatOpenAI(model="gpt-4o-mini", temperature=1.0),
        browser_profile=BrowserProfile(headless=False)  # Show browser window
    )
    await agent.run()

asyncio.run(main())

