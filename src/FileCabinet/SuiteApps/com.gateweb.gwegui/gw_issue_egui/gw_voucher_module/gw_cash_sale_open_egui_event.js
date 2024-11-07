define(['N/runtime', 'N/currentRecord', 'N/record', 'N/url', '../gw_common_utility/gw_common_invoice_utility'], function (runtime, currentRecord, record, url, invoiceutility) {
  /**
   * @NApiVersion 2.1
   * @NScriptType ClientScript
   * @NModuleScope Public
   */
  var exports = {}

  var _current_record = currentRecord.get()

  function pageInit(context) {
    // TODO
  }

  function onButtonClick() {
    var _eguiEditScriptId = 'customscript_gw_cash_sale_egui_ui_edit'
    var _eguiEditDeploymentId = 'customdeploy_gw_cash_sale_egui_ui_edit'

    var _internalId = _current_record.id
    if (_internalId != 0) {
      try {
		  
		var _user_obj        = runtime.getCurrentUser()
		var _cash_sale_record = record.load({
		  type: record.Type.CASH_SALE,
		  id: _internalId,
		  isDynamic: true,
		})
		var _subsidiary = _cash_sale_record.getValue({
		  fieldId: 'subsidiary',
		})		
		
	    //var _user_subsidiary = _user_obj.subsidiary
    	var _selected_business_no = getBusinessNoBySubsidiary(_subsidiary)
		
        var params = {
		  custpage_businessno :_selected_business_no,
          select_cash_sale_id: _internalId
        }
        window.location = url.resolveScript({
          scriptId: _eguiEditScriptId,
          deploymentId: _eguiEditDeploymentId,
          params: params,
          returnExternalUrl: false,
        })
      } catch (e) {
        console.log(e.name + ':' + e.message)
      }
    }
  }
  
  function getBusinessNoBySubsidiary(subsidiary) {
    var _business_no = ''
	var _company_ary = invoiceutility.getSellerInfoBySubsidiary(subsidiary)
    if (_company_ary!=null) {
    	for (var i=0; i<_company_ary.length; i++) {
    		var _company = _company_ary[i];
    		
    		_business_no = _company.tax_id_number 
    	}
    } 
    
    return _business_no;
  }

  exports.onButtonClick = onButtonClick
  exports.pageInit = pageInit

  return exports
})
