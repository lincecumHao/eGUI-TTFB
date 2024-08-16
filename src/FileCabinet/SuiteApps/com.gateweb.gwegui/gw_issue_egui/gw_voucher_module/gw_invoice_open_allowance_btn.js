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
				id: 'custpage_invoice_egui_edit_btn',
				label: '開立折讓(電子發票)',
				functionName: 'onButtonClickForAllowance()',
			})
			form.clientScriptModulePath = './gw_invoice_open_voucher_event.js'
		}
	}

	exports.beforeLoad = beforeLoad
	return exports
})
