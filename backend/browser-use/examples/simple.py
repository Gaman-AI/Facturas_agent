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

RFC: HEGC940821HZ7
Razón Social: Carlos Alejandro Hernández Gómez
Calle: PRIV DEL MARQUEZ
Número exterior: 404
Número interior: 4
Estado: San Luis Potosí
Municipio: San Luis Potosí
Colony: LOMAS 4A SECCION
Código Postal: 78183
Correo Electrónico: carlos@gaman.ai
Régimen Fiscal: Personas Físicas con Actividades Empresariales y Profesionales
Uso Factura: Gastos en general

# Procedimiento:

1. Ve a la pagina de facturación de walmart mexico https://facturacion.walmartmexico.com.mx/
2. Cierra el popup que aparece automaticamente al inicio
3. Haz click en el boton "Obtener factura" (es posible que el popup vuelva a aparecer, si es así, cerrar el popup y vuelve a hacer click en el boton "Obtener factura")
4. Llena los campos con los detalles proporcionados
5. Haz click en el boton "Continuar"
6.1. Si aparece una lista con varios RFC, nombre, etcétera, haz click en el que coincida con los detalles proporcionados
6.2. Si aparce un formulario vacío, llena los campos siguientes con los detalles proporcionados:

  - *Razón Social:* <input name="ctl00$ContentPlaceHolder1$txtRazon" type="text" maxlength="254" onchange="javascript:setTimeout('__doPostBack(\'ctl00$ContentPlaceHolder1$txtRazon\',\'\')', 0)" onkeypress="if (WebForm_TextBoxKeyHandler(event) == false) return false;" id="ctl00_ContentPlaceHolder1_txtRazon" class="txt-control">
  
  - *Calle:* <input name="ctl00$ContentPlaceHolder1$txtCalle" type="text" maxlength="50" id="ctl00_ContentPlaceHolder1_txtCalle" class="txt-control">
  
  - *Número Exterior:* <input name="ctl00$ContentPlaceHolder1$txtNumExt" type="text" maxlength="20" id="ctl00_ContentPlaceHolder1_txtNumExt" class="txt-control">
  
  - *Número Interior:* <input name="ctl00$ContentPlaceHolder1$txtNumInt" type="text" maxlength="15" id="ctl00_ContentPlaceHolder1_txtNumInt" class="txt-control">
  
  - *Estado:* <input name="ctl00$ContentPlaceHolder1$txtEstado" type="text" maxlength="250" id="ctl00_ContentPlaceHolder1_txtEstado" class="txt-control">
  
  - *Municipio:* <input name="ctl00$ContentPlaceHolder1$txtMunicipio" type="text" maxlength="250" id="ctl00_ContentPlaceHolder1_txtMunicipio" class="txt-control">
  
  - *Colonia:* <input name="ctl00$ContentPlaceHolder1$txtColonia" type="text" maxlength="250" id="ctl00_ContentPlaceHolder1_txtColonia" class="txt-control">
  
  - *Código Postal:* <input name="ctl00$ContentPlaceHolder1$txtCP" type="text" maxlength="5" id="ctl00_ContentPlaceHolder1_txtCP" class="txt-control ctrTextCp" onkeypress="return soloNum(event)">
  
  - *Régimen Fiscal:* 
  	<select name="ctl00$ContentPlaceHolder1$ddlregimenFiscal" onchange="javascript:setTimeout('__doPostBack(\'ctl00$ContentPlaceHolder1$ddlregimenFiscal\',\'\')', 0)" id="ctl00_ContentPlaceHolder1_ddlregimenFiscal" class="txt-control">
		<option selected="selected" value="0">Seleccione</option>
		<option value="605">Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
		<option value="606">Arrendamiento</option>
		<option value="607">Regimen de Enajenacion o Adquisicion de Bienes</option>
		<option value="608">Demas ingresos</option>
		<option value="610">Residentes en el Extranjero sin Establecimiento Permanente en Mexico</option>
		<option value="611">Ingresos por Dividendos (socios y accionistas)</option>
		<option value="612">Personas Fisicas con Actividades Empresariales y Profesionales</option>
		<option value="614">Ingresos por intereses</option>
		<option value="615">Regimen de los ingresos por obtencion de premios</option>
		<option value="616">Sin obligaciones fiscales</option>
		<option value="621">Incorporacion Fiscal</option>
		<option value="625">Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas</option>
		<option value="626">Regimen Simplificado de Confianza</option>

	</select>
 
  - *Uso Factura:*
  	<select name="ctl00$ContentPlaceHolder1$ddlusoCFDI" id="ctl00_ContentPlaceHolder1_ddlusoCFDI" class="txt-control">
	    <option value="0">Seleccione</option>
		<option value="G01">Adquisicion de mercancias</option>
		<option value="G02">Devoluciones, descuentos o bonificaciones</option>
		<option value="G03">Gastos en general</option>
		<option value="I01">Construcciones</option>
		<option value="I02">Mobilario y equipo de oficina por inversiones</option>
		<option value="I03">Equipo de transporte</option>
		<option value="I04">Equipo de computo y accesorios</option>
		<option value="I05">Dados, troqueles, moldes, matrices y herramental</option>
		<option value="I06">Comunicaciones telefonicas</option>
		<option value="I07">Comunicaciones satelitales</option>
		<option value="I08">Otra maquinaria y equipo</option>
		<option value="D01">Honorarios medicos, dentales y gastos hospitalarios</option>
		<option value="D02">Gastos medicos por incapacidad o discapacidad</option>
		<option value="D03">Gastos funerales</option>
		<option value="D04">Donativos</option>
		<option value="D05">Intereses reales efectivamente pagados por creditos hipotecarios (casa habitacion)</option>
		<option value="D06">Aportaciones voluntarias al SAR</option>
		<option value="D07">Primas por seguros de gastos medicos</option>
		<option value="D08">Gastos de transportacion escolar obligatoria</option>
		<option value="D09">Depositos en cuentas para el ahorro, primas que tengan como base planes de pensiones</option>
		<option value="D10">Pagos por servicios educativos (colegiaturas)</option>
		<option value="S01">Sin efectos fiscales</option>
  
	</select>
  
7. Haz click en "continuar"

IMPORTANTE: En el paso 6. El espacio para llenar un campo aparece inmediatamente a la derecha del nombre del campo y está dentro del mismo '<div class="row bg-grey pb-1">'. Por ejemplo, el espacio para llenar la Calle aparece inmediatamente a la derecha del nombre del campo "Calle:" y está dentro del div: 
'''				<div class="row bg-grey pb-1">
                    <div class="col-12 col-sm-12 col-md-3 col-lg-3 col-xl-3 col-xxl-3">
                        <span id="ctl00_ContentPlaceHolder1_lblCalle" class="Etiquetas text-nowrap fs-6">Calle:</span>
                    </div>
                    <div class="col-12 col-sm-12 col-md-6 col-lg-5 col-xl-5 col-xxl-5">
                        <input name="ctl00$ContentPlaceHolder1$txtCalle" type="text" maxlength="50" id="ctl00_ContentPlaceHolder1_txtCalle" class="txt-control">
                    </div>
                </div>'''
Nota también que el nombre del campo incluye "Calle" en id="ctl00_ContentPlaceHolder1_txtCalle".

"""

agent = Agent(task=walmart_task, llm=llm)


async def main():
	await agent.run()


if __name__ == '__main__':
	asyncio.run(main())
