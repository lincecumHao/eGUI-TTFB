/**
 *
 * @copyright 2024 GateWeb
 * @author Chesley Lo
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([], () => {

    let exports = {};

    exports.addBusinessEntitySelectOption = (companyArray, selectFieldObject) => {
        if (companyArray.length > 0) {
            for (let i = 0; i < companyArray.length; i++) {
                let eachCompanyObject = companyArray[i];
                log.debug({
                    title: 'addBusinessEntitySelectOption - eachCompanyObject',
                    details: JSON.stringify(eachCompanyObject)
                })
                const value = `${eachCompanyObject.tax_id_number}`
                const text = `${eachCompanyObject.tax_id_number}-${eachCompanyObject.be_gui_title}`
                selectFieldObject.addSelectOption({value, text})
            }
        }
    }

    return exports;
});
