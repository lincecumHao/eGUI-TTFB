define(['N/ui/dialog', 'N/url', 'N/currentRecord'], function (
  dialog,
  url,
  currentRecord
) {
  /**
   * Provides click handler for custom button on Customer Deposit
   *
   * @exports ess/add-button/cl
   *
   * @copyright 2020 Gate Web, LLC
   * @author Walter Chou se06$gateweb.com.tw>
   *
   * @NApiVersion 2.1
   * @NScriptType ClientScript
   * @NModuleScope Public
   * @appliedtorecord Customer Deposit
   */
  var exports = {}

  var _eguiEditScriptId = 'customscript_gw_deposit_egui_ui_edit'
  var _eguiEditDeploymentId = 'customdeploy_gw_deposit_egui_ui_edit'

  var _current_record = currentRecord.get()

  function pageInit(context) {
    try {
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function onButtonClick() {
    var _internalId = _current_record.id

    if (_internalId != 0) {
      try {
        //undepfunds
        var _sales_order = _current_record.getValue({
          fieldId: 'salesorder',
        })

        var params = {
          select_customer_deposit_id: _internalId,
          select_sales_order: _sales_order,
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

  exports.onButtonClick = onButtonClick
  exports.pageInit = pageInit
  return exports
})
