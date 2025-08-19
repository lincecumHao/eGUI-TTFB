/**
 *
 * @copyright 2025 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/search', 'N/runtime', '../../library/gw_date_util'], (search, runtime, dateUtil) => {
    let exports = {};

    function getCurrencyIdByCode(currencyCode) {
        const type = 'currency';
        let filters = [];
        filters.push(['symbol', 'is', currencyCode]);
        let columns = [];
        columns.push('name');
        const currencySearchObj = search.create({ type, filters, columns });
        let currencyId = null;
        currencySearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            currencyId = result.id;
            return true;
        });

        log.debug({
            title: 'getCurrencyIdByCode - currencyId',
            details: currencyId
        });

        return currencyId;
    }

    function isCompanyEnableSubsidiary() {
        return runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
    }

    function getAccountIdByAccountNumber(accountNumber) {
        log.debug({ title: 'getAccountIdByAccountNumber', details: accountNumber });
        const type = 'account';
        let filters = [];
        filters.push(['number', 'is', accountNumber]);
        filters.push('AND');
        filters.push(['isinactive', 'is', 'F']);
        let columns = [];
        columns.push('name');
        columns.push('displayname');
        columns.push('type');
        const accountSearchObj = search.create({ type, filters, columns });
        let accountId = null;
        accountSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            log.debug({
                title: 'getAccountIdByAccountNumber - result',
                details: JSON.stringify(result)
            });
            accountId = result.id;
            return true;
        });

        return accountId || accountNumber;
    }

    function formatDate(value) {
        return new Date(dateUtil.getDateWithFormat(value, 'YYYY-MM-DD', 'YYYY/MM/DD'));
    }

    exports.getAccountIdByAccountNumber = getAccountIdByAccountNumber;
    exports.isCompanyEnableSubsidiary = isCompanyEnableSubsidiary;
    exports.formatDate = formatDate;
    exports.getCurrencyIdByCode = getCurrencyIdByCode;
    return exports;
});
