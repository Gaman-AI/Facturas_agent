import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from browser_use.llm.openai.chat import ChatOpenAI
from browser_use import Agent

# Initialize the model
llm = ChatOpenAI(
	model='gpt-4.1-mini',
)


walmart_task = """
### Objetivo:

Tu objetivo es ir a la pagina de facturación de walmart mexico https://facturacion.walmartmexico.com.mx/ y generar una factura de mi ticket.

### Detalles de facturación:

TC: 835946320663807473652
TR: 02577
RFC: HEGC940821HZ7
Razón Social: Carlos Alejandro Hernández Gómez
País: Mexico
Calle: PRIV DEL MARQUEZ
Número Exterior: 404
Número Interior: 4
Colony: LOMAS 4A SECCION
Municipio: San Luis Potosí
Código Postal: 78183
Estado: San Luis Potosí
Régimen Fiscal: Personas Físicas con Actividades Empresariales y Profesionales
Uso del CFDI: Gastos en general

No necesitas usar todos los detalles, solo los que son necesarios.

### Procedimiento:

1. Ve a la pagina de facturación de walmart mexico https://facturacion.walmartmexico.com.mx/
2. Cierra el popup que aparece automaticamente al inicio
3. Haz click en el boton "Obtener factura" (es posible que el popup vuelva a aparecer, si es así, cerrar el popup y vuelve a hacer click en el boton "Obtener factura")
4. Llena los campos con los detalles proporcionados
5. Haz click en el boton "Continuar"
6.1. Si aparece una lista con varios RFC, nombre, etcétera, haz click en el que coincida con los detalles proporcionados
6.2. Si aparce un formulario vacío, llena los campos con los detalles proporcionados. El espacio para llenar un campo aparece inmediatamente a la derecha del nombre del campo.
7. Haz click en "continuar"

"""

agent = Agent(task=walmart_task, llm=llm)


async def main():
	await agent.run()


if __name__ == '__main__':
	asyncio.run(main())
