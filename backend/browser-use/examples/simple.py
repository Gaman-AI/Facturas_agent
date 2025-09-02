import asyncio
import os
import sys

from browser_use.llm.openai.chat import ChatOpenAI

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()


from browser_use import Agent

# Initialize the model
llm = ChatOpenAI(
	model='gpt-4.1-mini',
)


task = """ https://www4.oxxo.com:9443/facturacionElectronica-web/views/layout/inicio.do
Email: jorge@gaman.ai
RFC: DOGJ8603192W3
Company Name: JORGE DOMENZAIN GALINDO
Country: Mexico
Street: PRIV DEL MARQUEZ
Exterior Number: 404
Interior Number: 4
Colony: LOMAS 4A SECCION
Municipality: San Luis Potosí
Zip Code: 78216
State: San Luis Potosí
Tax Regimen: Personas Físicas con Actividades Empresariales y Profesionales
CDFI Usage: Gastos en general

Folio: 860523
Transaction Date: 04/06/2025
Total: 47.0
ID: 10LGA50YMB1
"""
agent = Agent(task=task, llm=llm)


async def main():
	await agent.run()


if __name__ == '__main__':
	asyncio.run(main())
