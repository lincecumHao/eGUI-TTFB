/**
 *
 * @copyright 2024 GateWeb
 * @author Chesley Lo
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 *
 * @NScriptType UserEventScript
 */
define([
    '../gw_common_utility/gw_lib_ue_utility'
], (
    gwLibUserEventUtility
) => {

    let exports = {};

    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = (scriptContext) => {
        if(scriptContext.type !== scriptContext.UserEventType.VIEW) return
        const form = scriptContext.form

        if(gwLibUserEventUtility.isNeedToDisplayCreateVoucherButton(scriptContext)) {
            const transactionParamsObject = gwLibUserEventUtility.getParamsByTransactionType(scriptContext)
            form.addButton({
                id: 'custpage_issue_egui_button',
                label: transactionParamsObject.buttonName,
                functionName: transactionParamsObject.functionName,
            })
            
            form.clientScriptModulePath = transactionParamsObject.scriptPath
        }
    }

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const beforeSubmit = (scriptContext) => {

    }

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const afterSubmit = (scriptContext) => {

    }

    exports.beforeLoad = beforeLoad;
    // exports.beforeSubmit = beforeSubmit;
    // exports.afterSubmit = afterSubmit;
    return exports;
});
