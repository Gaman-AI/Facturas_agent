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
# Objetivo:

Tu objetivo es ir a la pagina de facturación de walmart mexico https://facturacion.walmartmexico.com.mx/ y generar una factura de mi ticket.

# Detalles de facturación:

TC: 835946320663807473652
TR: 02577

RFC: DOGJ8603192W3
Razón Social: JORGE DOMENZAIN GALINDO
Calle: PRIV DEL MARQUEZ
Número exterior: 404
Número interior: 4
Estado: San Luis Potosí
Municipio: San Luis Potosí
Colonia: LOMAS 4A SECCION
Código Postal: 78216
Correo Electrónico: carlos@gaman.ai
Régimen Fiscal: Personas Físicas con Actividades Empresariales y Profesionales
Uso Factura: Gastos en general
Forma de Pago: Tarjeta de crédito

# Procedimiento:

1. Ve a la pagina de facturación de walmart mexico https://facturacion.walmartmexico.com.mx/
2. Cierra el popup que aparece automaticamente al inicio
3. Haz click en el boton "Obtener factura" (es posible que el popup vuelva a aparecer, si es así, cerrar el popup y vuelve a hacer click en el boton "Obtener factura")
4. Llena los campos con los detalles proporcionados
5. Haz click en el boton "Continuar"
6. Si aparece una lista con varios RFC, nombre, etcétera, haz click en el que coincida con los detalles proporcionados.
7. Llena los campos siguientes con los detalles proporcionados:

  - **Razón Social:* <input name="ctl00$ContentPlaceHolder1$txtRazon" type="text" maxlength="254" onchange="javascript:setTimeout('__doPostBack(\'ctl00$ContentPlaceHolder1$txtRazon\',\'\')', 0)" onkeypress="if (WebForm_TextBoxKeyHandler(event) == false) return false;" id="ctl00_ContentPlaceHolder1_txtRazon" class="txt-control">
  
  - *Calle:* <input name="ctl00$ContentPlaceHolder1$txtCalle" type="text" maxlength="50" id="ctl00_ContentPlaceHolder1_txtCalle" class="txt-control">
  
  - *Número Exterior:* <input name="ctl00$ContentPlaceHolder1$txtNumExt" type="text" maxlength="20" id="ctl00_ContentPlaceHolder1_txtNumExt" class="txt-control">
  
  - *Número Interior:* <input name="ctl00$ContentPlaceHolder1$txtNumInt" type="text" maxlength="15" id="ctl00_ContentPlaceHolder1_txtNumInt" class="txt-control">
  
  - *Estado:* <input name="ctl00$ContentPlaceHolder1$txtEstado" type="text" maxlength="250" id="ctl00_ContentPlaceHolder1_txtEstado" class="txt-control">
  
  - *Municipio:* <input name="ctl00$ContentPlaceHolder1$txtMunicipio" type="text" maxlength="250" id="ctl00_ContentPlaceHolder1_txtMunicipio" class="txt-control">
  
  - *Colonia:* <input name="ctl00$ContentPlaceHolder1$txtColonia" type="text" maxlength="250" id="ctl00_ContentPlaceHolder1_txtColonia" class="txt-control">
  
  - *Código Postal:* <input name="ctl00$ContentPlaceHolder1$txtCP" type="text" maxlength="5" id="ctl00_ContentPlaceHolder1_txtCP" class="txt-control ctrTextCp" onkeypress="return soloNum(event)">

  - **Régimen Fiscal:* Dropdown: The 'Régimen Fiscal' dropdown should be opened and the correct option highlighted. Send keyboard Enter key to select the highlighted 'Régimen Fiscal' option. Attempts to select dropdown options programmatically fail due to element index issues or key press errors.

  - **Uso Factura:* Dropdown: The 'Uso Factura' dropdown should be opened and the correct option highlighted. Send keyboard Enter key to select the highlighted 'Uso Factura' option. Attempts to select dropdown options programmatically fail due to element index issues or key press errors.
  
8. Haz click en "Aceptar"
9. Haz click en "Continuar"
10. Rellena el valor de *Forma de Pago:* 
	<select name="ctl00$ContentPlaceHolder1$ddlPaymentType" onchange="javascript:setTimeout('__doPostBack(\'ctl00$ContentPlaceHolder1$ddlPaymentType\',\'\')', 0)" id="ctl00_ContentPlaceHolder1_ddlPaymentType" class="txt-control">
		<option selected="selected" value="0">--Seleccione--</option>
		<option value="04">Tarjeta de crédito</option>
		<option value="05">Monedero electrónico</option>
		<option value="28">Tarjeta de débito</option>

	</select>
selecciona el valor proporcionado.
11. Haz click en "Continuar".
12. Selecciona  *Enviar a correo electrónico* y haz click en "Facturar".
"""

oxxo_task = """
# Objetivo:

Tu objetivo es ir a la pagina de facturación de walmart mexico https://www4.oxxo.com:9443/facturacionElectronica-web/views/layout/inicio.do y generar una factura de mi ticket.

# Detalles de facturación:

Fecha de venta: 15/09/2025
Fol_Vta: 2219205
ID: 10LGA50YMB1
Total: 65.50

RFC: DOGJ8603192W3
Nombre de Razón Social: JORGE DOMENZAIN GALINDO
Calle: PRIV DEL MARQUEZ
Número Ext.: 404
Número Int.: 4
Colonia: LOMAS 4A SECCION
Delegación / Municipio: SAN LUIS POTOSI
Código Postal: 78216
Estado: SAN LUIS POTOSI
Régimen Fiscal: PERSONAS FISICAS CON ACTIVIDADES EMPRESARIALES Y PROFESIONALES
Uso CFDI: GASTOS EN GENERAL
Correo Electrónico: carlos@gaman.ai
Forma de Pago: Tarjeta de crédito

# Procedimiento:

1. Cierra el popup que aparece automaticamente al inicio.
2. Rellena Fecha de venta: al presionar en el campo, se abrirá un calendario, selecciona la fecha proporcionada.
3. Rellena Folio de venta, ID de venta y Total (2 Decimales).
4. Presiona "Validar Ticket": <span style="color:#515659; font:11px Lato,sans-serif; font-weight:bold; float: right; padding-right: 14px">Validar Ticket</span> (luego espera 3 segundos, pues es posible que la página tenga que cargar).
5. Presiona "Continua   r" (luego espera 3 segundos, pues es posible que la página tenga que cargar).
6. Rellena 
  - RFC,
  - Nombre de Razón Social (Selecciona el campo y luego espera 3 segundos, pues es posible que la página tenga que cargar, después vielve a seleccionar el campo y escribe el valor proporcionado), 
  - Calle, 
  - Número Ext., 
  - Número Int., 
  - Colonia, 
  - Delegación / Municipio, 
  - Código Postal. (luego espera 3 segundos, selecciona otro campo cualquiera que ya esté rellenado y espera 3 segundos más, pues es posible que la página tenga que cargar).

7. Rellena los siguientes campos (IMPORTANTE: Estos son dropdowns. Once the dropdown list is visible and scrollable, the next step is to scroll inside the dropdown list to locate the correct value and click it to select): 
  - Estado,
  - Régimen Fiscal, 
  - Uso CFDI.

"""

agent = Agent(task=oxxo_task, llm=llm)


async def main():
	await agent.run()


if __name__ == '__main__':
	asyncio.run(main())
