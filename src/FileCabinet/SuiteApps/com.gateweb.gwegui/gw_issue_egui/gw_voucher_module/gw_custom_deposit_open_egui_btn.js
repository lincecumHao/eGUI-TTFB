define([
    'N/runtime',
    'N/record',
    '../gw_common_utility/gw_lib_ue_utility'
], function (
    runtime,
    record,
    gwLibUserEventUtility
) {
  /**
   * @NApiVersion 2.1
   * @NScriptType UserEventScript
   * @NModuleScope Public
   */
  const exports = {}

  function beforeLoad(context) {
    if(context.type !== context.UserEventType.VIEW) return
    const form = context.form

    if(gwLibUserEventUtility.isNeedToDisplayCreateVoucherButton(context)) {
        form.addButton({
            id: 'custpage_customer_deposit_egui_edit_btn',
            label: '開立發票',
            functionName: 'onButtonClick()',
        })
        form.clientScriptModulePath = './gw_custom_deposit_open_egui_event.js'
    }
  }

  exports.beforeLoad = beforeLoad
  return exports
})
