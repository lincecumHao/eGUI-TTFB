/**
 *
 * @copyright 2024 GateWeb
 * @author Chesley Lo
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/record',
    'N/search',
    'N/runtime',
    './gw_common_invoice_utility'
], (
    record,
    search,
    runtime,
    invoiceUtility
) => {

    let exports = {};

    exports.isNeedToDisplayCreateVoucherButton = (context) => {
        let flag = false
        const recordObject = context.newRecord

        const singleIssueEvidenceStatusValue = invoiceUtility.getManualOpenID()
        const isLocked = recordObject.getValue({fieldId: 'custbody_gw_lock_transaction'})
        const isIssueEGUI = recordObject.getValue({fieldId: 'custbody_gw_is_issue_egui'})
        const issueEvidenceStatusId = recordObject.getValue({fieldId: 'custbody_gw_evidence_issue_status'})
        let issueEvidenceStatusText = ''
        if(issueEvidenceStatusId) {
            const lookupResultObject = search.lookupFields({
                type: 'customrecord_gw_evidence_status',
                id: issueEvidenceStatusId,
                columns: ['custrecord_gw_evidence_status_value']
            })
            issueEvidenceStatusText = lookupResultObject['custrecord_gw_evidence_status_value']
        }

        log.debug({
            title: 'isNeedToDisplayCreateVoucherButton - params info',
            details: {
                singleIssueEvidenceStatusValue,
                isLocked,
                isIssueEGUI,
                issueEvidenceStatusId,
                issueEvidenceStatusText
            }
        })

        if(singleIssueEvidenceStatusValue === issueEvidenceStatusText && isIssueEGUI && !isLocked) {
            // TODO check current user role
            const currentUserObject = runtime.getCurrentUser()
            const companyArray = invoiceUtility.getBusinessEntitByUserId(currentUserObject)
            log.debug({
                title: 'isNeedToDisplayCreateVoucherButton - companyArray',
                details: companyArray
            })
            if(companyArray.length > 0)  flag = true
        }

        log.debug({title: 'isNeedToDisplayCreateVoucherButton - flag', details: flag})

        return flag
    }

    return exports
});
