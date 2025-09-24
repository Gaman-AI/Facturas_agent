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
4. **Validar Ticket**: Presiona el botón **"Validar Ticket"**. Espera 3 segundos mientras la página carga. Es muy importante presionar este botón correctamente para poder continuar con el proceso.
5. **Continuar**: Haz clic en el botón **"Continuar"**. Espera otros 3 segundos para la carga de la página. Es muy importante presionar este botón correctamente para poder continuar con el proceso.
6. Rellena 
  - RFC,
  - Nombre de Razón Social (Selecciona el campo y luego espera 3 segundos, pues es posible que la página tenga que cargar, después vielve a seleccionar el campo y escribe el valor proporcionado), 
  - Calle, 
  - Número Ext., 
  - Número Int., 
  - Colonia, 
  - Delegación / Municipio, 
  - Código Postal. (luego espera 3 segundos, selecciona otro campo cualquiera que ya esté rellenado y espera 3 segundos más, pues es posible que la página tenga que cargar).

7. Rellena los siguientes campos con menus desplegables.

  *PROCEDIMIENTO:* El procedimiento para rellenar los menus desplegables es el siguiente: 
    - Haz click en el menú desplegable, espera un segundo y asegúrate de que el menú se haya desplegado correctamente.
    - Navega con la flecha hacia abajo hasta que la opción correcta se muestre en la lista y selecciónala. Aunque creas que encontraste la opción correcta y la quieras clickear, esto no servirá, es absolutamente necesario que te desplaces con las flechas hasta estar sobre la opción correcta.
    - Sigue desplazándote hacia abajo hasta que estes sobre la opción correcta, es posible que tengas que presionar la flecha hacia abajo más de 30 veces, pero continua haciendo esto hasta que estes sobre la opción correcta.
    - Selecciona la opción correcta.

  Los campos desplegables son los siguientes: 
    - Estado,
    - Régimen Fiscal, 
    - Uso CFDI.
"""


oxxo_dd = """
**Objetivo**:
Rellenar el campo desplegable de Estado con el valor *SAN LUIS POTOSI* en la página de facturación de OXXO: [https://www4.oxxo.com:9443/facturacionElectronica-web/views/layout/inicio.do](https://www4.oxxo.com:9443/facturacionElectronica-web/views/layout/inicio.do)

**Detalles de facturación**:

* **Fecha de venta**: 15/09/2025
* **Folio de venta**: 2219205
* **ID de venta**: 10LGA50YMB1
* **Total**: 65.50
* **Estado**: SAN LUIS POTOSI

**Instrucciones**:

1. **Cerrar popup**: Al ingresar al sitio, cierra el popup que aparece automáticamente.
2. **Rellenar campos de ticket**:

   * Haz clic en el campo de "Fecha de venta" y selecciona la fecha correspondiente del calendario (15/09/2025).
   * Ingresa el **Folio de venta** (2219205), el **ID de venta** (10LGA50YMB1), y el **Total** (65.50) con 2 decimales.
3. **Validar Ticket**: Presiona el botón **"Validar Ticket"**. Espera 3 segundos mientras la página carga. Es muy importante presionar este botón correctamente para poder continuar con el proceso.
4. **Continuar**: Haz clic en el botón **"Continuar"**. Espera otros 3 segundos para la carga de la página. Es muy importante presionar este botón correctamente para poder continuar con el proceso.
5. **Rellenar el siguiente campo desplegable**:

     * **Estado**: SAN LUIS POTOSI
       Presiona el índice del menú desplegable de Estado (posiblemente índice 79), luego navega con la flecha hacia abajo hasta que la opción correcta se muestre en la lista y selecciónala. Aunque creas que encontraste la opción correcta y la quieras clickear, esto no servirá, es absolutamente necesario que te desplaces con las flechas hasta estar sobre la opción correcta. Sigue desplazándote hacia abajo hasta quue estes sobre la opción correcta, es posible que tengas que presionar la flecha hacia abajo más de 30 veces, pero continua haciendo esto hasta que estes sobre la opción correcta y selecciónala.
"""


agent = Agent(task=oxxo_task, llm=llm)


async def main():
	await agent.run()


if __name__ == '__main__':
	asyncio.run(main())
