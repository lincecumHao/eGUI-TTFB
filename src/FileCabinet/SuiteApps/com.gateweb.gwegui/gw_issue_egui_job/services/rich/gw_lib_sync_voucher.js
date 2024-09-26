/**
 *
 * @copyright 2023 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/search',
    'N/runtime',
    'N/https',
    'N/record',
    'N/xml',
    'N/file',
    '../../../gw_issue_egui/gw_common_utility/gw_syncegui_to_document_utility',
    '../../../gw_issue_egui/gw_common_utility/gw_common_date_utility',
    '../../../gw_issue_egui/gw_common_utility/gw_common_string_utility',
    '../../../gw_issue_egui/gw_common_utility/gw_common_invoice_utility',
    '../../../gw_issue_egui/gw_common_utility/gw_common_migxml_utility',
    '../../../gw_issue_egui/gw_common_utility/gw_common_configure',
    '../../../gw_dao/taxType/gw_dao_tax_type_21',
    '../../../gw_issue_egui/services/email/gw_service_egui_email',
    '../../../library/gw_date_util',
    '../../../library/gw_lib_companyConfig'
], (
    search,
    runtime,
    https,
    record,
    xml,
    file,
    synceguidocument,
    dateutility,
    stringutility,
    invoiceutility,
    migxmlutility,
    gwconfigure,
    gwTaxType21,
    gwServiceEGUIEmail,
    gwDateUtil,
    gwLibCompanyConfig
) => {
    let exports = {}

    const DEFAULT_PASSWORD = '1qaz2wsx'
    const statusMapping = {
        '上傳成功': 'C',
        '上傳失敗': 'E'
    }

    function getSearchFilters() {
        let filters = []
        filters.push(['custrecord_gw_voucher_upload_status', 'is', 'A'])
        filters.push('AND')
        filters.push(['custrecord_gw_voucher_status', 'is', 'VOUCHER_SUCCESS'])
        filters.push('AND')
        filters.push(['custrecord_gw_need_upload_egui_mig', 'isnot', 'NONE'])
        filters.push('AND')
        filters.push(['custrecord_gw_need_upload_egui_mig', 'isnot', 'RETRIEVE'])
        filters.push('AND')
        filters.push(['custrecord_gw_is_completed_detail', 'is', 'T'])

        return filters
    }

    function getSearchColumns() {
        return ["name", "id", "custrecord_gw_apply_internal_id", "custrecord_gw_voucher_type", "custrecord_gw_voucher_number", "custrecord_gw_voucher_date", "custrecord_gw_voucher_time", "custrecord_gw_voucher_yearmonth", "custrecord_gw_seller", "custrecord_gw_seller_name", "custrecord_gw_seller_address", "custrecord_gw_buyer", "custrecord_gw_buyer_name", "custrecord_gw_buyer_email", "custrecord_gw_buyer_address", "custrecord_gw_buyer_dept_code", "custrecord_gw_voucher_dept_code", "custrecord_gw_voucher_dept_name", "custrecord_gw_voucher_classification", "custrecord_gw_invoice_type", "custrecord_gw_mig_type", "custrecord_gw_voucher_format_code", "custrecord_gw_carrier_type", "custrecord_gw_carrierid1", "custrecord_gw_carrierid2", "custrecord_gw_npoban", "custrecord_gw_clearance_mark", "custrecord_gw_main_remark", "custrecord_gw_random_number", "custrecord_gw_discount_amount", "custrecord_gw_discount_count", "custrecord_gw_voucher_owner", "custrecord_gw_voucher_status", "custrecord_gw_voucher_upload_status", "custrecord_gw_accept_status", "custrecord_gw_confirm_status", "custrecord_gw_uploadstatus_messag", "custrecord_gw_sales_amount", "custrecord_gw_free_sales_amount", "custrecord_gw_zero_sales_amount", "custrecord_gw_tax_amount", "custrecord_gw_tax_type", "custrecord_gw_tax_rate", "custrecord_gw_total_amount", "custrecord_gw_need_upload_egui_mig", "custrecord_gw_print_mark", "custrecord_gw_is_printed_pdf", "custrecord_gw_is_printed_paper", "custrecord_gw_lock_transaction", "custrecord_gw_is_completed_detail", "custrecord_gw_voucher_extra_memo", "custrecord_gw_discount_sales_amount", "custrecord_gw_discount_free_amount", "custrecord_gw_discount_zero_amount", "custrecord_gw_is_manual_voucher", "custrecord_gw_original_buyer_id", "custrecord_gw_voucher_main_apply_user_id", "custrecord_gw_upload_access_model", "custrecord_voucher_sale_tax_apply_period", "custrecord_gw_voucher_sales_tax_apply", "custrecord_gw_applicable_zero_tax", "custrecord_gw_customs_export_category", "custrecord_gw_customs_export_no", "custrecord_gw_customs_export_date", "custrecord_gw_ns_transaction", "custrecord_gw_dm_mig_type", "custrecord_gw_dm_seller_profile", "custrecord_upload_xml_file_name"]
    }

    exports.getPendingUploadData = function () {
        let searchFilters = getSearchFilters()
        let searchColumns = getSearchColumns()

        let getPendingUploadDataSearchObject = search.create({
            type: 'customrecord_gw_voucher_main', filters: searchFilters, columns: searchColumns
        })

        let searchResultCount = getPendingUploadDataSearchObject.runPaged().count
        log.debug({
            title: 'getPendingUploadData - searchResultCount',
            details: searchResultCount
        })

        return getPendingUploadDataSearchObject
    }

    function getRichCompanyInformationBySellerId(sellerId) {
        const searchType = 'customrecord_gw_business_entity'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_be_tax_id_number', 'is', sellerId])
        let searchColumns = []
        searchColumns.push('custrecord_gw_be_tax_id_number')
        searchColumns.push('custrecord_gw_be_company_key')
        searchColumns.push('custrecord_gw_be_company_account')
        var customrecord_gw_business_entitySearchObj = search.create({
            type: searchType, filters: searchFilters, columns: searchColumns
        });
        var searchResultCount = customrecord_gw_business_entitySearchObj.runPaged().count;
        log.debug('customrecord_gw_business_entitySearchObj result count', searchResultCount);
        let richCompanyInformation = []
        customrecord_gw_business_entitySearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            richCompanyInformation.push(JSON.parse(JSON.stringify(result)))
            return true;
        })

        return richCompanyInformation
    }

    function getRichToken(richBaseURL, companyInformation) {
        let responseObj = {
            code: 0, body: ''
        }
        let url = `${richBaseURL}/api/authenticate`
        let headers = {}
        headers['Accept'] = `text/html, application/json, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8, application/pdf`
        headers['Accept-Language'] = `en-us`
        headers['Content-Type'] = 'application/json'
        let requestBody = {
            'username': companyInformation.values.custrecord_gw_be_company_account, 'password': DEFAULT_PASSWORD
        }
        let response = https.post({
            url: url, body: JSON.stringify(requestBody), headers: headers
        })
        responseObj.code = response.code
        if (response.code !== 200) {
            responseObj.body = 'Error Occurs: ' + response.body
        } else {
            responseObj.body = JSON.parse(response.body)
        }
        log.debug({
            title: 'getToken responseObj', details: responseObj
        })

        return responseObj
    }

    function converNode(node, parentNodeName, nodeName, nodeValue, isAccessDetail) {
        try {
            var _hasChildren = node.hasChildNodes()
            if (_hasChildren) {
                var _childNodes = node.childNodes
                for (var i = 0; i < _childNodes.length; i++) {
                    var _childNode = _childNodes[i]
                    converNode(_childNode, parentNodeName, nodeName, nodeValue, isAccessDetail)
                }
            } else {
                var _nodeName = node.nodeName
                var _nodeText = node.textContent

                var _parentNodeName = node.parentNode.nodeName
                if (isAccessDetail === true) {
                    if (_parentNodeName === nodeName) {
                        node.textContent = nodeValue
                    }
                } else {
                    if (_parentNodeName === parentNodeName && _nodeName === nodeName) {
                        node.textContent = nodeValue
                    }
                }
            }
        } catch (e) {
            log.error(e.name, e.message)
        }
    }

    function setXmlMainAndAmountValue(_xmlDocument, selectedpath, parentNodeName, nodeName, nodeValue) {
        try {
            var _migInvoiceNode = xml.XPath.select({
                node: _xmlDocument, xpath: selectedpath,
            })

            for (var i = 0; i < _migInvoiceNode.length; i++) {
                var _childNodes = _migInvoiceNode[i].childNodes

                for (var j = 0; j < _childNodes.length; j++) {
                    var _childNode = _childNodes[j]
                    var _childNodeName = _childNodes[j].nodeName
                    //處理Main及Amount
                    if (_childNodeName !== 'Details') {
                        //處理Main及Amount
                        converNode(_childNode, parentNodeName, nodeName, nodeValue, false)
                    }
                }
            }
        } catch (e) {
            log.error(e.name, e.message)
        }
    }

    function setXMLMainForEGUI(voucherMainRecordObject, _xmlDocument) {
        const _select_path = 'Invoice'
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'InvoiceNumber', voucherMainRecordObject.custrecord_gw_voucher_number)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'InvoiceDate', voucherMainRecordObject.custrecord_gw_voucher_date)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'InvoiceTime', voucherMainRecordObject.custrecord_gw_voucher_time)


        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Seller', 'Identifier', voucherMainRecordObject.custrecord_gw_seller)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Seller', 'Name', voucherMainRecordObject.custrecord_gw_seller_name)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Seller', 'Address', voucherMainRecordObject.custrecord_gw_seller_address)

        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Buyer', 'Identifier', voucherMainRecordObject.custrecord_gw_buyer)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Buyer', 'Name', voucherMainRecordObject.custrecord_gw_buyer_name)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Buyer', 'Address', voucherMainRecordObject.custrecord_gw_buyer_address)

        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'InvoiceType', voucherMainRecordObject.custrecord_gw_invoice_type)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'RandomNumber', voucherMainRecordObject.custrecord_gw_random_number)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'MainRemark', voucherMainRecordObject.custrecord_gw_main_remark)

        let _zero_sales_amount = Math.round(stringutility.convertToFloat(voucherMainRecordObject.custrecord_gw_zero_sales_amount)).toString()
        log.debug({
            title: `setXMLMainForEGUI - _zero_sales_amount`,
            details: `typeof: ${typeof _zero_sales_amount}, value: ${_zero_sales_amount}`
        })
        if (_zero_sales_amount !== '0') {
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'CustomsClearanceMark', voucherMainRecordObject.custrecord_gw_clearance_mark)
        }
        if (voucherMainRecordObject.custrecord_gw_buyer !== '0000000000') {
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'RelateNumber', voucherMainRecordObject.id)
        }
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'PrintMark', voucherMainRecordObject.custrecord_gw_print_mark)

        if (voucherMainRecordObject.custrecord_gw_mig_type === 'B2C') {
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'CarrierType', voucherMainRecordObject.custrecord_gw_carrier_type)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'CarrierId1', voucherMainRecordObject.custrecord_gw_carrierid1)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'CarrierId2', voucherMainRecordObject.custrecord_gw_carrierid2)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'NPOBAN', voucherMainRecordObject.custrecord_gw_npoban)
        }

        let _donateMark = voucherMainRecordObject.custrecord_gw_npoban !== '' ? '1' : '0'
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'DonateMark', _donateMark)

        let _sales_amount = voucherMainRecordObject.custrecord_gw_sales_amount
        let _tax_amount = voucherMainRecordObject.custrecord_gw_tax_amount
        let _free_sales_amount = voucherMainRecordObject.custrecord_gw_free_sales_amount
        let _tax_rate = (stringutility.convertToFloat(voucherMainRecordObject.custrecord_gw_tax_rate) === 0) ? '0' : voucherMainRecordObject.custrecord_gw_tax_rate
        let _tax_type = voucherMainRecordObject.custrecord_gw_tax_type
        let _total_amount = voucherMainRecordObject.custrecord_gw_total_amount

        if (voucherMainRecordObject.custrecord_gw_mig_type !== 'B2E' && voucherMainRecordObject.custrecord_gw_buyer === '0000000000') {
            _sales_amount = Math.round(stringutility.convertToFloat(_sales_amount) + stringutility.convertToFloat(_tax_amount)).toString()
            _tax_amount = '0' //B2C的發票，稅金為0
        } else {
            _sales_amount = Math.round(stringutility.convertToFloat(_sales_amount)).toString()
        }

        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'SalesAmount', _sales_amount)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'FreeTaxSalesAmount', Math.round(stringutility.convertToFloat(_free_sales_amount)).toString())
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'ZeroTaxSalesAmount', Math.round(stringutility.convertToFloat(_zero_sales_amount)).toString())
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TaxAmount', Math.round(stringutility.convertToFloat(_tax_amount)).toString())
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TaxRate', _tax_rate)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TaxType', _tax_type)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TotalAmount', Math.round(stringutility.convertToFloat(_total_amount)).toString())
    }

    function replaceEGUIXML(voucherMainRecordObject, _mig_xml) {
        const replaceMapping = {
            B2BS: `Invoice xmlns="urn:GEINV:eInvoiceMessage:C0401:3.1"`,
            B2BE: `Invoice xmlns="urn:GEINV:eInvoiceMessage:A0101:3.1"`,
            B2C: `Invoice xmlns="urn:GEINV:eInvoiceMessage:C0401:3.1"`,
            B2B: `Invoice xmlns="urn:GEINV:eInvoiceMessage:A0401:3.1"`
        }

        _mig_xml = _mig_xml.replace('Invoice', replaceMapping[voucherMainRecordObject.custrecord_gw_mig_type])

        log.debug({
            title: 'replaceEGUIXML - _mig_xml', details: _mig_xml
        })

        if (voucherMainRecordObject.custrecord_gw_voucher_type === 'B2BS' || voucherMainRecordObject.custrecord_gw_voucher_type === 'B2C') {
            if (voucherMainRecordObject.custrecord_gw_zero_sales_amount === '0') _mig_xml = _mig_xml.replace('<CustomsClearanceMark/>', '') //非零稅要拿掉
            if (voucherMainRecordObject.custrecord_gw_buyer === '0000000000') _mig_xml = _mig_xml.replace('<RelateNumber/>', '') //B2C +C0401
        }
        if (voucherMainRecordObject.custrecord_gw_voucher_type === 'B2B' && voucherMainRecordObject.custrecord_gw_zero_sales_amount === '0') {
            _mig_xml = _mig_xml.replace('<CustomsClearanceMark/>', '')
        }

        return _mig_xml
    }

    function getVoucherDetailsByVoucherMainId(voucherMainId) {
        const searchType = 'customrecord_gw_voucher_details'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_voucher_main_internal_id.internalid', 'anyof', voucherMainId])
        let searchColumns = []
        searchColumns.push('name')
        searchColumns.push('custrecord_gw_dtl_apply_internal_id')
        searchColumns.push('custrecord_gw_voucher_main_internal_id')
        searchColumns.push('custrecord_gw_dtl_voucher_type')
        searchColumns.push('custrecord_gw_item_description')
        searchColumns.push('custrecord_gw_item_unit')
        searchColumns.push('custrecord_gw_unit_price')
        searchColumns.push('custrecord_gw_item_quantity')
        searchColumns.push('custrecord_gw_dtl_item_tax_code')
        searchColumns.push('custrecord_gw_dtl_item_tax_rate')
        searchColumns.push('custrecord_gw_item_amount')
        searchColumns.push('custrecord_gw_item_tax_amount')
        searchColumns.push('custrecord_gw_item_total_amount')
        searchColumns.push('custrecord_gw_item_seq')
        searchColumns.push('custrecord_gw_item_remark')
        searchColumns.push('custrecord_gw_original_gui_internal_id')
        searchColumns.push('custrecord_gw_original_gui_number')
        searchColumns.push('custrecord_gw_original_gui_date')
        searchColumns.push('custrecord_gw_original_gui_yearmonth')
        searchColumns.push('custrecord_gw_dtl_voucher_number')
        searchColumns.push('custrecord_gw_dtl_voucher_date')
        searchColumns.push('custrecord_gw_dtl_voucher_time')
        searchColumns.push('custrecord_gw_dtl_voucher_yearmonth')
        searchColumns.push('custrecord_gw_dtl_voucher_status')
        searchColumns.push('custrecord_gw_dtl_voucher_upload_status')
        searchColumns.push('custrecord_gw_ns_document_type')
        searchColumns.push('custrecord_gw_ns_document_id')
        searchColumns.push('custrecord_gw_ns_document_apply_id')
        searchColumns.push('custrecord_gw_ns_document_number')
        searchColumns.push('custrecord_gw_ns_document_item_id')
        searchColumns.push('custrecord_gw_ns_document_items_seq')
        searchColumns.push('custrecord_gw_ns_item_discount_amount')
        searchColumns.push('custrecord_gw_ns_item_discount_count')
        searchColumns.push('custrecord_gw_dtl_voucher_apply_period')

        var customrecord_gw_voucher_detailsSearchObj = search.create({
            type: searchType, filters: searchFilters, columns: searchColumns
        });
        var searchResultCount = customrecord_gw_voucher_detailsSearchObj.runPaged().count
        log.debug('customrecord_gw_voucher_detailsSearchObj result count', searchResultCount)
        let voucherDetailsArray = []
        customrecord_gw_voucher_detailsSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            voucherDetailsArray.push(JSON.parse(JSON.stringify(result)))
            return true
        })

        return voucherDetailsArray
    }

    function setEGUIXmlDetailsItemValue(_xmlDocument, isFirst, description, quantity, unit, unitPrice, amount, sequenceNumber, itemremark) {
        try {
            var _migInvoiceNode = xml.XPath.select({
                node: _xmlDocument, xpath: 'Invoice',
            })

            for (var i = 0; i < _migInvoiceNode.length; i++) {
                var _childNodes = _migInvoiceNode[i].childNodes

                for (var j = 0; j < _childNodes.length; j++) {
                    var _childNode = _childNodes[j]
                    var _childNodeName = _childNodes[j].nodeName
                    //處理Details
                    if (_childNodeName === 'Details') {
                        if (isFirst === true) {
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Description', description, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Quantity', quantity, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Unit', unit, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'UnitPrice', unitPrice, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Amount', amount, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'SequenceNumber', sequenceNumber, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Remark', itemremark, false)
                        } else {
                            var _productItemNode = _childNodes[j].lastChild
                            //複製筆數
                            var _copiedNode = _productItemNode.cloneNode({
                                deep: true,
                            })
                            converNode(_copiedNode, 'Description', 'Description', description, true)
                            converNode(_copiedNode, 'Quantity', 'Quantity', quantity, true)
                            converNode(_copiedNode, 'Unit', 'Unit', unit, true)
                            converNode(_copiedNode, 'UnitPrice', 'UnitPrice', unitPrice, true)
                            converNode(_copiedNode, 'Amount', 'Amount', amount, true)
                            converNode(_copiedNode, 'SequenceNumber', 'SequenceNumber', sequenceNumber, true)
                            converNode(_copiedNode, 'Remark', 'Remark', itemremark, true)

                            _childNodes[j].appendChild(_copiedNode)
                        }
                    }
                }
            }
        } catch (e) {
            log.error(e.name, e.message)
        }
    }

    function setXMLDetailsForEGUI(voucherMainRecordObject, xmlDocument, voucherDetailsArray) {
        let isFirstItem = true
        voucherDetailsArray.forEach(function (voucherDetailsObject, index) {
            log.debug({
                title: `setXMLDetailsForEGUI - voucherDetailsObject, index: ${index}`, details: voucherDetailsObject
            })
            if (index !== 0) isFirstItem = false
            let itemDesc = (voucherDetailsObject.values.custrecord_gw_item_description.length > 0) ? voucherDetailsObject.values.custrecord_gw_item_description : ' '
            let itemQuantity = Math.round(stringutility.convertToFloat(voucherDetailsObject.values.custrecord_gw_item_quantity)).toString()
            let itemUnit = voucherDetailsObject.values.custrecord_gw_item_unit
            let itemAmount = voucherDetailsObject.values.custrecord_gw_item_amount
            let itemTotalAmount = voucherDetailsObject.values.custrecord_gw_item_total_amount
            let itemTaxRate = voucherDetailsObject.values.custrecord_gw_dtl_item_tax_rate
            itemTaxRate.replace('%', '')
            itemTaxRate = Math.round(stringutility.convertToFloat(itemTaxRate)).toString()
            let itemSeq = voucherDetailsObject.values.custrecord_gw_item_seq
            let itemRemark = (voucherDetailsObject.values.custrecord_gw_item_remark.length > 0) ? voucherDetailsObject.values.custrecord_gw_item_remark : ' '
            if (voucherMainRecordObject.custrecord_gw_mig_type !== 'B2E' && voucherMainRecordObject.custrecord_gw_buyer === '0000000000') {
                itemAmount = (stringutility.convertToFloat(itemTotalAmount) === 0) ? Math.round(stringutility.convertToFloat(itemAmount) * (1 + stringutility.convertToFloat(itemTaxRate) / 100)).toString() : itemTotalAmount
            }
            let unitPrice = (stringutility.convertToFloat(itemQuantity) !== 0) ? (stringutility.convertToFloat(itemAmount) / stringutility.convertToFloat(itemQuantity)).toFixed(gwconfigure.getGwNumericToFixed()).toString() : '0'
            setEGUIXmlDetailsItemValue(xmlDocument, isFirstItem, itemDesc, itemQuantity, itemUnit, unitPrice, itemAmount, itemSeq, itemRemark)
        })
    }

    function setXMLMainForAllowance(voucherMainRecordObject, _xmlDocument) {
        const _select_path = 'Allowance'
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'AllowanceNumber', voucherMainRecordObject.custrecord_gw_voucher_number)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'AllowanceDate', voucherMainRecordObject.custrecord_gw_voucher_date)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'AllowanceType', '2')

        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Seller', 'Identifier', voucherMainRecordObject.custrecord_gw_seller)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Seller', 'Name', voucherMainRecordObject.custrecord_gw_seller_name)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Seller', 'Address', voucherMainRecordObject.custrecord_gw_seller_address)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Buyer', 'Identifier', voucherMainRecordObject.custrecord_gw_buyer)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Buyer', 'Name', voucherMainRecordObject.custrecord_gw_buyer_name)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Buyer', 'Address', voucherMainRecordObject.custrecord_gw_buyer_address)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'InvoiceType', voucherMainRecordObject.custrecord_gw_invoice_type)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'RandomNumber', voucherMainRecordObject.custrecord_gw_random_number)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'MainRemark', voucherMainRecordObject.custrecord_gw_main_remark)
        setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'PrintMark', voucherMainRecordObject.custrecord_gw_print_mark)

        if (voucherMainRecordObject.custrecord_gw_mig_type === 'B2C') {
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'CarrierType', voucherMainRecordObject.custrecord_gw_carrier_type)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'CarrierId1', voucherMainRecordObject.custrecord_gw_carrierid1)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'CarrierId2', voucherMainRecordObject.custrecord_gw_carrierid2)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'NPOBAN', voucherMainRecordObject.custrecord_gw_npoban)

            let _donateMark = voucherMainRecordObject.custrecord_gw_npoban !== '' ? '1' : '0'
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Main', 'DonateMark', _donateMark)

            let _sales_amount = voucherMainRecordObject.custrecord_gw_sales_amount
            let _tax_amount = voucherMainRecordObject.custrecord_gw_tax_amount
            let _free_sales_amount = voucherMainRecordObject.custrecord_gw_free_sales_amount
            let _tax_rate = (stringutility.convertToFloat(voucherMainRecordObject.custrecord_gw_tax_rate) === 0) ? '0' : voucherMainRecordObject.custrecord_gw_tax_rate
            let _tax_type = voucherMainRecordObject.custrecord_gw_tax_type
            let _total_amount = voucherMainRecordObject.custrecord_gw_total_amount
            let _zero_sales_amount = Math.round(stringutility.convertToFloat(voucherMainRecordObject.custrecord_gw_zero_sales_amount)).toString()
            log.debug({
                title: `setXMLMainForAllowance - _zero_sales_amount`,
                details: `typeof: ${typeof _zero_sales_amount}, value: ${_zero_sales_amount}`
            })
            _sales_amount = Math.round(stringutility.convertToFloat(_sales_amount)).toString()
            //折讓單要放未稅金額
            _total_amount = (stringutility.convertToFloat(_sales_amount) + stringutility.convertToFloat(_free_sales_amount) + stringutility.convertToFloat(_zero_sales_amount)).toString()

            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'SalesAmount', _sales_amount)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'FreeTaxSalesAmount', Math.round(stringutility.convertToFloat(_free_sales_amount)).toString())
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'ZeroTaxSalesAmount', Math.round(stringutility.convertToFloat(_zero_sales_amount)).toString())
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TaxAmount', Math.round(stringutility.convertToFloat(_tax_amount)).toString())
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TaxRate', _tax_rate)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TaxType', _tax_type)
            setXmlMainAndAmountValue(_xmlDocument, _select_path, 'Amount', 'TotalAmount', Math.round(stringutility.convertToFloat(_total_amount)).toString())
        }
    }

    function setAllowanceXmlDetailsItemValue(_xmlDocument, xmlpath, isFirst, description, quantity, unit, unitPrice, amount, sequenceNumber, itemremark, originalInvoiceNumber, originalInvoiceDate, taxType, taxAmount) {
        try {
            var _migInvoiceNode = xml.XPath.select({
                node: _xmlDocument, xpath: xmlpath,
            })

            for (var i = 0; i < _migInvoiceNode.length; i++) {
                var _childNodes = _migInvoiceNode[i].childNodes

                for (var j = 0; j < _childNodes.length; j++) {
                    var _childNode = _childNodes[j]
                    var _childNodeName = _childNodes[j].nodeName
                    //處理Details
                    if (_childNodeName === 'Details') {
                        if (isFirst === true) {
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'OriginalInvoiceNumber', originalInvoiceNumber, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'OriginalInvoiceDate', originalInvoiceDate, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'OriginalSequenceNumber', sequenceNumber, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'OriginalDescription', description, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Quantity', quantity, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Unit', unit, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'UnitPrice', unitPrice, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Amount', amount, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'AllowanceSequenceNumber', sequenceNumber, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'TaxType', taxType, false)
                            converNode(_childNodes[j].firstChild, 'ProductItem', 'Tax', taxAmount, false)
                            //converNode(_childNodes[j].firstChild, 'ProductItem', 'Remark', itemremark, false);
                        } else {
                            var _productItemNode = _childNodes[j].lastChild
                            //複製筆數
                            var _copiedNode = _productItemNode.cloneNode({
                                deep: true,
                            })
                            converNode(_copiedNode, 'OriginalInvoiceNumber', 'OriginalInvoiceNumber', originalInvoiceNumber, true)
                            converNode(_copiedNode, 'OriginalInvoiceDate', 'OriginalInvoiceDate', originalInvoiceDate, true)
                            converNode(_copiedNode, 'OriginalInvoiceDate', 'OriginalSequenceNumber', sequenceNumber, true)
                            converNode(_copiedNode, 'OriginalDescription', 'OriginalDescription', description, true)
                            converNode(_copiedNode, 'Quantity', 'Quantity', quantity, true)
                            converNode(_copiedNode, 'Unit', 'Unit', unit, true)
                            converNode(_copiedNode, 'UnitPrice', 'UnitPrice', unitPrice, true)
                            converNode(_copiedNode, 'Amount', 'Amount', amount, true)
                            converNode(_copiedNode, 'AllowanceSequenceNumber', 'AllowanceSequenceNumber', sequenceNumber, true)
                            converNode(_copiedNode, 'ProductItem', 'TaxType', taxType, true)
                            converNode(_copiedNode, 'ProductItem', 'Tax', taxAmount, true)
                            //converNode(_copiedNode, 'Remark', 'Remark', itemremark, true);

                            _childNodes[j].appendChild(_copiedNode)
                        }
                    }
                }
            }
        } catch (e) {
            log.error(e.name, e.message)
        }
    }

    function setXMLDetailsForAllowance(voucherMainRecordObject, xmlDocument, voucherDetailsArray) {
        const _select_path = 'Allowance'
        let isFirstItem = true
        voucherDetailsArray.forEach(function (voucherDetailsObject, index) {
            log.debug({
                title: `setXMLDetailsForAllowance - voucherDetailsObject, index: ${index}`,
                details: voucherDetailsObject
            })
            if (index !== 0) isFirstItem = false

            let taxObj = gwTaxType21.getTaxTypeByTaxCode(voucherDetailsObject.values.custrecord_gw_dtl_item_tax_code)
            log.debug('setXMLDetailsForAllowance - taxObj', taxObj)
            let itemTaxType = (taxObj) ? taxObj.value : '1';
            let _allowanceTaxAmount = Math.round(stringutility.convertToFloat(voucherDetailsObject.values.custrecord_gw_item_tax_amount)).toString()

            let itemDesc = (voucherDetailsObject.values.custrecord_gw_item_description.length > 0) ? voucherDetailsObject.values.custrecord_gw_item_description : ' '
            let itemQuantity = Math.round(stringutility.convertToFloat(voucherDetailsObject.values.custrecord_gw_item_quantity)).toString()
            let itemUnit = voucherDetailsObject.values.custrecord_gw_item_unit
            let itemAmount = voucherDetailsObject.values.custrecord_gw_item_amount
            let itemTotalAmount = voucherDetailsObject.values.custrecord_gw_item_total_amount
            let itemTaxRate = voucherDetailsObject.values.custrecord_gw_dtl_item_tax_rate
            itemTaxRate.replace('%', '')
            itemTaxRate = Math.round(stringutility.convertToFloat(itemTaxRate)).toString()
            let itemSeq = voucherDetailsObject.values.custrecord_gw_item_seq
            let itemRemark = (voucherDetailsObject.values.custrecord_gw_item_remark.length > 0) ? voucherDetailsObject.values.custrecord_gw_item_remark : ' '
            let unitPrice = (stringutility.convertToFloat(itemQuantity) !== 0) ? (stringutility.convertToFloat(itemAmount) / stringutility.convertToFloat(itemQuantity)).toFixed(gwconfigure.getGwNumericToFixed()).toString() : '0'
            let originalInvoiceNumber = voucherDetailsObject.values.custrecord_gw_original_gui_number
            let originalInvoiceDate = voucherDetailsObject.values.custrecord_gw_original_gui_date
            setAllowanceXmlDetailsItemValue(xmlDocument, _select_path, isFirstItem, itemDesc, itemQuantity, itemUnit, unitPrice, itemAmount, itemSeq, itemRemark, originalInvoiceNumber, originalInvoiceDate, itemTaxType, _allowanceTaxAmount)
        })
    }

    function replaceAllowanceXML(voucherMainRecordObject, _mig_xml) {
        const replaceMapping = {
            B2BS: `Allowance xmlns="urn:GEINV:eInvoiceMessage:D0401:3.1"`,
            B2BE: `Allowance xmlns="urn:GEINV:eInvoiceMessage:B0101:3.1"`,
            B2C: `Allowance xmlns="urn:GEINV:eInvoiceMessage:D0401:3.1"`,
            B2B: `Allowance xmlns="urn:GEINV:eInvoiceMessage:B0401:3.1"`
        }
        _mig_xml = _mig_xml.replace('Allowance', replaceMapping[voucherMainRecordObject.custrecord_gw_mig_type])
        log.debug({
            title: 'replaceAllowanceXML - _mig_xml',
            details: _mig_xml
        })
        return _mig_xml
    }

    function generalXMLForUpload(voucherMainRecordObject) {
        log.debug({
            title: 'generalXMLForUpload', details: 'start...'
        })
        log.debug({
            title: 'generalXMLForUpload - voucherMainRecordObject', details: voucherMainRecordObject
        })

        let generatedObject = {}

        let xmlDocument = xml.Parser.fromString({
            text: loadInvoiceMigXml(voucherMainRecordObject.custrecord_gw_voucher_type, voucherMainRecordObject.custrecord_gw_mig_type),
        })
        if (voucherMainRecordObject.custrecord_gw_voucher_type === 'EGUI') {
            setXMLMainForEGUI(voucherMainRecordObject, xmlDocument)
            const voucherDetailsArray = getVoucherDetailsByVoucherMainId(voucherMainRecordObject.id)
            setXMLDetailsForEGUI(voucherMainRecordObject, xmlDocument, voucherDetailsArray)
            let _mig_xml = xml.Parser.toString({document: xmlDocument})
            _mig_xml = replaceEGUIXML(voucherMainRecordObject, _mig_xml)
            log.debug({
                title: 'generalXMLForUpload - EGUI - _mig_xml', details: _mig_xml
            })
            generatedObject.migXML = _mig_xml
            generatedObject.xmlMigType = invoiceutility.getMigType('APPLY', voucherMainRecordObject.custrecord_gw_voucher_type, voucherMainRecordObject.custrecord_gw_mig_type)
            generatedObject.fileName = `${generatedObject.xmlMigType}-${voucherMainRecordObject.custrecord_gw_voucher_number}-${new Date().getTime()}`
        } else {
            setXMLMainForAllowance(voucherMainRecordObject, xmlDocument)
            const voucherDetailsArray = getVoucherDetailsByVoucherMainId(voucherMainRecordObject.id)
            setXMLDetailsForAllowance(voucherMainRecordObject, xmlDocument, voucherDetailsArray)
            let _mig_xml = xml.Parser.toString({document: xmlDocument})
            _mig_xml = replaceAllowanceXML(voucherMainRecordObject, _mig_xml)
            log.debug({
                title: 'generalXMLForUpload - Allowance - _mig_xml', details: _mig_xml
            })
            generatedObject.migXML = _mig_xml
            generatedObject.xmlMigType = invoiceutility.getMigType('APPLY', voucherMainRecordObject.custrecord_gw_voucher_type, voucherMainRecordObject.custrecord_gw_mig_type)
            generatedObject.fileName = `${generatedObject.xmlMigType}-${voucherMainRecordObject.custrecord_gw_voucher_number}-${new Date().getTime()}`
        }
        return generatedObject
    }

    function loadInvoiceMigXml(voucherType, migType) {
        const migXmlPath = '../../../gw_issue_egui/gw_mig_xml/'
        var _xmlString
        const filePathMapping = {
            EGUI: {
                B2BE: `${migXmlPath}gw_a0101.xml`, B2BS: `${migXmlPath}gw_a0401.xml`, B2C: `${migXmlPath}gw_c0401.xml`
            }, ALLOWANCE: {
                B2BE: `${migXmlPath}gw_b0101.xml`,
                B2BS: `${migXmlPath}gw_b0401.xml`,
                B2B: `${migXmlPath}gw_b0401.xml`,
                B2C: `${migXmlPath}gw_d0401.xml`
            }
        }
        try {
            var _file_path = filePathMapping[voucherType][migType]
            log.debug({
                title: 'loadInvoiceMigXml - _file_path', details: _file_path
            })
            if (_file_path !== '') _xmlString = file.load(_file_path).getContents()
        } catch (e) {
            log.error(e.name, e.message)
        }
        return _xmlString
    }

    function uploadThroughRich(richBaseURL, companyInformation, getRichTokenResponse, generatedObject) {
        log.debug({
            title: 'uploadThroughRich', details: 'start...'
        })

        let responseObj = {
            code: 0, body: ''
        }
        let url = `${richBaseURL}/api/v1/mig/${generatedObject.xmlMigType}/${companyInformation.values.custrecord_gw_be_company_key}?fileName=${generatedObject.fileName}.xml`
        log.debug({
            title: 'uploadThroughRich - url', details: url
        })
        let headers = {}
        headers['Authorization'] = `Bearer ${getRichTokenResponse.body.id_token}`
        headers['Accept'] = `text/html, application/json, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8, application/pdf`
        headers['Accept-Language'] = `en-us`
        headers['Content-Type'] = 'application/xml'

        let response = https.post({
            url: url, body: generatedObject.migXML, headers: headers
        })
        responseObj.code = response.code
        if (response.code !== 200) {
            responseObj.body = 'Error Occurs: ' + response.body
        } else {
            responseObj.body = JSON.parse(response.body)
        }
        log.debug({
            title: 'uploadThroughRich responseObj', details: responseObj
        })

        return responseObj

    }

    function createUploadLog(voucherMainRecordObject, generatedObject, uploadResultResponse) {
        try {
            log.debug({
                title: 'createUploadLog', details: 'start...'
            })
            log.debug({
                title: 'createUploadLog - voucherMainRecordObject', details: voucherMainRecordObject
            })
            log.debug({
                title: 'createUploadLog - generatedObject', details: generatedObject
            })
            log.debug({
                title: 'createUploadLog - uploadResultResponse', details: uploadResultResponse
            })

            let uploadLogRecordObject = record.create({
                type: 'customrecord_gw_xml_upload_log', isDynamic: true,
            })

            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher_apply_id', value: voucherMainRecordObject.id,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher', value: voucherMainRecordObject.id,
            })

            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_seller_ban', value: voucherMainRecordObject.custrecord_gw_seller,
            })
            // not existing
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_buyer_id',
                value: voucherMainRecordObject.custrecord_gw_original_buyer_id,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_buyer_ban', value: voucherMainRecordObject.custrecord_gw_buyer,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher_number',
                value: voucherMainRecordObject.custrecord_gw_voucher_number,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher_yearmonth',
                value: voucherMainRecordObject.custrecord_gw_voucher_yearmonth,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher_migtype', value: generatedObject.xmlMigType,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher_xml', value: generatedObject.migXML,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_response_status', value: uploadResultResponse.code,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_response_message', value: uploadResultResponse.body.message,
            })

            var _upload_voucher_date = gwDateUtil.getCurrentDateInYYYYMMDD()
            var _upload_voucher_time = gwDateUtil.getCurrentDateTime().time
            log.debug({
                title: 'createUploadLog - _upload_voucher_date', details: _upload_voucher_date
            })
            log.debug({
                title: 'createUploadLog - _upload_voucher_time', details: _upload_voucher_time
            })

            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher_date', value: _upload_voucher_date,
            })
            uploadLogRecordObject.setValue({
                fieldId: 'custrecord_gw_upload_voucher_time', value: _upload_voucher_time,
            })
            if (uploadResultResponse.code !== 200) {
                uploadLogRecordObject.setValue({
                    fieldId: 'custrecord_gw_download_voucher_status', value: 'E',
                })
            }
            const resultId = uploadLogRecordObject.save()
            log.debug({
                title: 'createUploadLog - resultId', details: resultId
            })
        } catch (e) {
            log.error({
                title: 'createUploadLog - e', details: e
            })
        }
    }

    function updateVoucherMainRecord(voucherMainRecordObject, generatedObject, uploadResultResponse) {
        const CANCEL_MIG_TYPE = ['A0201', 'C0501', 'A0501', 'B0201', 'D0501', 'B0501']
        try {
            log.debug({
                title: 'updateVoucherMainRecord', details: 'start...'
            })

            let submitFieldsObject = {}
            submitFieldsObject['custrecord_gw_upload_access_model'] = 'NETSUITE'
            submitFieldsObject['custrecord_upload_xml_file_name'] = generatedObject.fileName
            if (uploadResultResponse.code !== 200) {
                const responseBody = JSON.parse(uploadResultResponse.body.replace('Error Occurs: ', ''))
                log.debug({
                    title: 'updateVoucherMainRecord - responseBody', details: responseBody
                })
                if(CANCEL_MIG_TYPE.indexOf(generatedObject.xmlMigType) !== -1) {
                    submitFieldsObject['custrecord_gw_voucher_status'] = 'CANCEL_ERROR'
                } else {
                    submitFieldsObject['custrecord_gw_voucher_status'] = 'VOUCHER_ERROR'
                }

                submitFieldsObject['custrecord_gw_voucher_upload_status'] = 'E'
                submitFieldsObject['custrecord_gw_uploadstatus_messag'] = responseBody.subErrors[0].message
            } else {
                submitFieldsObject['custrecord_gw_voucher_upload_status'] = 'P'
                if(CANCEL_MIG_TYPE.indexOf(generatedObject.xmlMigType) !== -1) {
                    submitFieldsObject['custrecord_gw_voucher_status'] = 'CANCEL_UPLOAD'
                    submitFieldsObject['custrecord_upload_xml_file_name'] = generatedObject.fileName
                }
                // submitFieldsObject['custrecord_gw_uploadstatus_messag'] = uploadResultResponse.body.message
            }

            const resultId = record.submitFields({
                type: 'customrecord_gw_voucher_main',
                id: voucherMainRecordObject.id,
                values: submitFieldsObject
            })
            log.debug({title: 'updateVoucherMainRecord - resultId', details: resultId})

        } catch (e) {
            log.error({
                title: 'updateVoucherMainRecord - e', details: e
            })
        }
    }

    function getLinkedTransactionByVoucherMainId(voucherMainId) {
        const searchType = 'customrecord_gw_voucher_details'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_voucher_main_internal_id.internalid', 'anyof', voucherMainId])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_ns_document_apply_id.mainline', 'is', 'T'])
        let searchColumns = []
        searchColumns.push(search.createColumn({
            name: "internalid", join: "CUSTRECORD_GW_NS_DOCUMENT_APPLY_ID", summary: "GROUP", sort: search.Sort.ASC
        }))
        searchColumns.push(search.createColumn({
            name: "type", join: "CUSTRECORD_GW_NS_DOCUMENT_APPLY_ID", summary: "GROUP"
        }))
        var customrecord_gw_voucher_detailsSearchObj = search.create({
            type: searchType, filters: searchFilters, columns: searchColumns
        });
        var searchResultCount = customrecord_gw_voucher_detailsSearchObj.runPaged().count
        log.debug('customrecord_gw_voucher_detailsSearchObj result count', searchResultCount)
        let linkedTransactionArray = []
        customrecord_gw_voucher_detailsSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            linkedTransactionArray.push(JSON.parse(JSON.stringify(result)))
            return true
        })

        return linkedTransactionArray
    }

    function updateNetSuiteTransactionByVoucherMainId(voucherMainId) {
        log.debug({
            title: 'updateNetSuiteTransactionByVoucherMainId', details: 'start...'
        })
        log.debug({
            title: 'updateNetSuiteTransactionByVoucherMainId - voucherMainId', details: voucherMainId
        })
        const linkedTransactionArray = getLinkedTransactionByVoucherMainId(voucherMainId)
        log.debug({
            title: 'updateNetSuiteTransactionByVoucherMainId - linkedTransactionArray', details: linkedTransactionArray
        })
    }

    exports.mainProcess = function (eachObject) {
        try {
            log.debug({
                title: 'mainProcess', details: 'start...'
            })
            log.audit({
                title: 'mainProcess - eachObject', details: eachObject
            })
            const richProcessSearchResult = richProcess()[0]
            log.debug({
                title: 'mainProcess - richProcessSearchResult', details: richProcessSearchResult
            })
            if (richProcessSearchResult.values.custrecord_gw_conf_rich_process) {
                const sellerId = eachObject.custrecord_gw_seller
                //get company key and company account id
                const companyInformationArray = getRichCompanyInformationBySellerId(sellerId)
                log.debug({
                    title: 'mainProcess - companyInformationArray', details: companyInformationArray
                })
                if (companyInformationArray.length === 0) throw 'Can Not Find Mapped Company Info For Rich Process'
                // proceed rich process
                const richBaseURL = richProcessSearchResult.values.custrecord_gw_conf_rich_base_url
                // get token
                const getRichTokenResponse = getRichToken(richBaseURL, companyInformationArray[0])
                log.debug({
                    title: 'mainProcess - getRichTokenResponse', details: getRichTokenResponse
                })
                if (getRichTokenResponse.code !== 200) {
                    throw getRichTokenResponse
                }
                const generatedObject = generalXMLForUpload(eachObject)
                log.debug({
                    title: 'mainProcess - generatedObject', details: generatedObject
                })
                const uploadResultResponse = uploadThroughRich(richBaseURL, companyInformationArray[0], getRichTokenResponse, generatedObject)
                createUploadLog(eachObject, generatedObject, uploadResultResponse)
                updateVoucherMainRecord(eachObject, generatedObject, uploadResultResponse)
                let uploadStatusCode = (uploadResultResponse.code === 200) ? 'P' : 'E'
                synceguidocument.syncEguiUploadStatusToNSEvidenceStatus(eachObject.custrecord_gw_voucher_status, uploadStatusCode, eachObject.custrecord_gw_need_upload_egui_mig, eachObject.id)            }
            log.debug({
                title: 'mainProcess', details: 'end...'
            })
        } catch (e) {
            log.error({
                title: 'mainProcess - e', details: e
            })
        }

    }

    function richProcess() {
        log.debug({
            title: 'richProcess - runtime.accountId', details: runtime.accountId
        })
        const searchType = 'customrecord_gw_egui_config'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_conf_ns_acct_id', 'is', runtime.accountId.toUpperCase()])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_conf_rich_process', 'is', 'T'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_conf_rich_base_url', 'isnotempty', 'isnotempty'])
        let searchColumns = []
        searchColumns.push('custrecord_gw_conf_ns_acct_id')
        searchColumns.push('custrecord_gw_conf_rich_process')
        searchColumns.push('custrecord_gw_conf_rich_base_url')
        var customrecord_gw_egui_configSearchObj = search.create({
            type: searchType, filters: searchFilters, columns: searchColumns
        });
        var searchResultCount = customrecord_gw_egui_configSearchObj.runPaged().count;
        log.debug('customrecord_gw_egui_configSearchObj result count', searchResultCount);
        let richProcessSearchResult = []
        customrecord_gw_egui_configSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            richProcessSearchResult.push(JSON.parse(JSON.stringify(result)))
            return true;
        })

        return richProcessSearchResult
    }

    function getSearchPendingUpdateStatusFilters() {
        let searchFilters = []
        searchFilters.push(['custrecord_gw_voucher_upload_status', 'is', 'P'])

        return searchFilters
    }

    exports.getPendingUpdateStatusData = function () {
        let searchFilters = getSearchPendingUpdateStatusFilters()
        let searchColumns = getSearchColumns()

        let getPendingUpdateStatusDataSearchObject = search.create({
            type: 'customrecord_gw_voucher_main', filters: searchFilters, columns: searchColumns
        })

        let searchResultCount = getPendingUpdateStatusDataSearchObject.runPaged().count
        log.debug({
            title: 'getPendingUpdateStatusData - searchResultCount',
            details: searchResultCount
        })

        return getPendingUpdateStatusDataSearchObject
    }

    function getVoucherStatusThroughRich(eachObject, richBaseURL, companyInformation, getRichTokenResponse) {
        let responseObj = {
            code: 0, body: ''
        }
        const xmlMigType = invoiceutility.getMigType('APPLY', eachObject.custrecord_gw_voucher_type, eachObject.custrecord_gw_mig_type)
        let url = `${richBaseURL}/api/v1/mig/${xmlMigType}/${companyInformation.values.custrecord_gw_be_company_key}?migNumber=${eachObject.custrecord_gw_voucher_number}&migDate=${eachObject.custrecord_gw_voucher_date}`
        log.debug({
            title: 'getVoucherStatusThroughRich - url', details: url
        })
        let headers = {}
        headers['Authorization'] = `Bearer ${getRichTokenResponse.body.id_token}`
        headers['Accept'] = `application/json`
        headers['Accept-Language'] = `en-us`
        headers['Content-Type'] = 'application/json'

        let response = https.get({
            url: url, headers: headers
        })

        responseObj.code = response.code
        if (response.code !== 200) {
            responseObj.body = 'Error Occurs: ' + response.body
        } else {
            responseObj.body = JSON.parse(response.body)
        }
        log.debug({
            title: 'getVoucherStatusThroughRich responseObj', details: responseObj
        })

        return responseObj
    }

    function updateVoucherMain(eachObject, getVoucherStatusResponse) {
        let submitFieldsObject = {}
        submitFieldsObject['custrecord_gw_voucher_upload_status'] = statusMapping[getVoucherStatusResponse.body.uploadStatus]
        if(statusMapping[getVoucherStatusResponse.body.uploadStatus] === 'E') submitFieldsObject['custrecord_gw_uploadstatus_messag'] = getVoucherStatusResponse.body.natErrorMessage

        if(eachObject.custrecord_gw_voucher_status.indexOf('CANCEL') !== -1 && getVoucherStatusResponse.body.status === '作廢') {
            submitFieldsObject['custrecord_gw_voucher_status'] = (statusMapping[getVoucherStatusResponse.body.uploadStatus] === 'C') ? 'CANCEL_SUCCESS' : 'CANCEL_ERROR'
        }

        log.debug({
            title: 'updateVoucherMain - submitFieldsObject',
            details: submitFieldsObject
        })

        const resultId = record.submitFields({
            type: 'customrecord_gw_voucher_main',
            id: eachObject.id,
            values: submitFieldsObject
        })

        log.debug({
            title: 'updateVoucherMain - resultId',
            details: resultId
        })
    }

    function updateUploadLog(eachObject, getVoucherStatusResponse) {
        log.debug({title: 'updateUploadLog', details: 'start...'})
        //TODO - find existing log by voucher main id
        //TODO - update log
        const searchType = 'customrecord_gw_xml_upload_log'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_upload_voucher.internalid', 'anyof', eachObject.id])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_download_voucher_status', 'isempty', ''])

        let searchColumns = []
        searchColumns.push('internalid')
        var customrecord_gw_xml_upload_logSearchObj = search.create({
            type: searchType,
            filters: searchFilters,
            columns: searchColumns
        });
        var searchResultCount = customrecord_gw_xml_upload_logSearchObj.runPaged().count;
        log.debug("customrecord_gw_xml_upload_logSearchObj result count",searchResultCount);
        customrecord_gw_xml_upload_logSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            const logRecordId = result.id
            let submitFieldsObject = {}
            submitFieldsObject['custrecord_gw_download_voucher_status'] = statusMapping[getVoucherStatusResponse.body.uploadStatus]
            submitFieldsObject['custrecord_gw_download_voucher_date'] = gwDateUtil.getCurrentDateInYYYYMMDD()
            submitFieldsObject['custrecord_gw_download_voucher_time'] = gwDateUtil.getCurrentDateTime().time
            if(statusMapping[getVoucherStatusResponse.body.uploadStatus] === 'E') {
                //TODO set error msg
                submitFieldsObject['custrecord_gw_download_voucher_message'] = getVoucherStatusResponse.body.natErrorMessage
            }
            const resultId = record.submitFields({
                type: searchType,
                id: logRecordId,
                values: submitFieldsObject
            })
            log.debug({title: 'updateUploadLog - resultId', details: resultId})
            return true;
        });

        log.debug({title: 'updateUploadLog', details: 'end...'})
    }

    function updateLinkedTransaction(eachObject, getVoucherStatusResponse, linkedTransactionArray) {
        log.debug({title: 'updateLinkedTransaction', details: 'start...'})
        linkedTransactionArray.forEach(function (eachLinkedTransactionObject) {
            const uploadStatus = statusMapping[getVoucherStatusResponse.body.uploadStatus]
            let voucherStatus = eachObject.custrecord_gw_voucher_status
            if(eachObject.custrecord_gw_voucher_status.indexOf('CANCEL') !== -1 && getVoucherStatusResponse.body.status === '作廢') {
                voucherStatus = (statusMapping[getVoucherStatusResponse.body.uploadStatus] === 'C') ? 'CANCEL_SUCCESS' : 'CANCEL_ERROR'
            }
            log.debug({
                title: 'uploadStatus|voucherStatus',
                details: {
                    uploadStatus,
                    voucherStatus
                }
            })
            const mappedStatus = synceguidocument.getGwEvidenceStatus(voucherStatus, uploadStatus, 'ALL')
            log.debug({
                title: 'updateLinkedTransaction - mappedStatus',
                details: mappedStatus
            })
            const resultId = record.submitFields({
                type: eachLinkedTransactionObject.linkedTransactionType,
                id: eachLinkedTransactionObject.linkedTransactionId,
                values: {
                    custbody_gw_evidence_issue_status: mappedStatus
                }
            })

            log.debug({
                title: 'updateLinkedTransaction - submitFields result id',
                details: resultId
            })
        })
    }

    function updateDepositVoucherRecordStatus(eachObject, getVoucherStatusResponse, linkedTransactionArray) {
        let uploadStatus = statusMapping[getVoucherStatusResponse.body.uploadStatus]
        let voucherStatus = eachObject.custrecord_gw_voucher_status
        if(eachObject.custrecord_gw_voucher_status.indexOf('CANCEL') !== -1 && getVoucherStatusResponse.body.status === '作廢' && uploadStatus === 'C') {
            voucherStatus = 'D'
        }
        linkedTransactionArray.forEach(function (eachLinkedTransactionObject) {
            if(eachLinkedTransactionObject.linkedTransactionType === record.Type.CUSTOMER_DEPOSIT) {
                const recordType = 'customrecord_gw_deposit_voucher_record'
                let searchFilters = []
                searchFilters.push(['custrecord_gw_deposit_voucher_main_id',' equalto', eachObject.id])
                let searchColumns = []
                searchColumns.push('custrecord_gw_deposit_voucher_status')
                searchColumns.push('custrecord_gw_deposit_voucher_main_id')
                var customrecord_gw_deposit_voucher_recordSearchObj = search.create({
                    type: recordType,
                    filters: searchFilters,
                    columns: searchColumns
                })
                var searchResultCount = customrecord_gw_deposit_voucher_recordSearchObj.runPaged().count
                log.debug('customrecord_gw_deposit_voucher_recordSearchObj result count', searchResultCount)
                customrecord_gw_deposit_voucher_recordSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    const resultId = record.submitFields({
                        type: recordType,
                        id: result.id,
                        values: {
                            custrecord_gw_deposit_voucher_status: voucherStatus
                        }
                    })
                    log.debug({
                        title: 'updateDepositVoucherRecordStatus - submitFields resultId',
                        details: resultId
                    })
                    return true;
                })
            }
        })
    }

    function getLinkedTransaction(eachObject, getVoucherStatusResponse) {
        log.debug({title: 'getLinkedTransaction', details: 'start...'})
        const TRANSACTION_TYPE_MAPPING = {
            'CustInvc': record.Type.INVOICE,
            'CustCred': record.Type.CREDIT_MEMO,
            'CustDep': record.Type.CUSTOMER_DEPOSIT,
            'CashSale': record.Type.CASH_SALE,
            'CashRfnd': record.Type.CASH_REFUND
        }
        //TODO - find the linked transaction
        const searchType = 'customrecord_gw_voucher_details'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_voucher_main_internal_id.internalid', 'anyof', eachObject.id])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_ns_document_apply_id.mainline', 'is', 'T'])
        let searchColumns = []
        searchColumns.push(
            search.createColumn({
                name: 'internalid',
                join: 'CUSTRECORD_GW_NS_DOCUMENT_APPLY_ID',
                summary: 'GROUP',
                sort: search.Sort.ASC
            })
        )
        searchColumns.push(
            search.createColumn({
                name: 'type',
                join: 'CUSTRECORD_GW_NS_DOCUMENT_APPLY_ID',
                summary: 'GROUP'
            })
        )
        var customrecord_gw_voucher_detailsSearchObj = search.create({
            type: searchType,
            filters: searchFilters,
            columns: searchColumns
        });
        var searchResultCount = customrecord_gw_voucher_detailsSearchObj.runPaged().count;
        log.debug('customrecord_gw_voucher_detailsSearchObj result count',searchResultCount);
        let linkedTransactionArray = []
        customrecord_gw_voucher_detailsSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            log.debug({
                title: 'updateLinkedTransaction - find the linked transaction - result',
                details: result
            })
            const linkedTransactionId = result.getValue({name: 'internalid', join: 'CUSTRECORD_GW_NS_DOCUMENT_APPLY_ID', summary: 'GROUP'})
            const linkedTransactionType = result.getValue({name: 'type', join: 'CUSTRECORD_GW_NS_DOCUMENT_APPLY_ID', summary: 'GROUP'})
            const uploadStatus = statusMapping[getVoucherStatusResponse.body.uploadStatus]
            let voucherStatus = eachObject.custrecord_gw_voucher_status
            if(eachObject.custrecord_gw_voucher_status.indexOf('CANCEL') !== -1 && getVoucherStatusResponse.body.status === '作廢') {
                voucherStatus = (statusMapping[getVoucherStatusResponse.body.uploadStatus] === 'C') ? 'CANCEL_SUCCESS' : 'CANCEL_ERROR'
            }
            linkedTransactionArray.push({
                linkedTransactionId: linkedTransactionId,
                linkedTransactionType: TRANSACTION_TYPE_MAPPING[linkedTransactionType]
            })
            return true
        })

        return linkedTransactionArray
    }

    function getVoucherDetailsSummaryAmountByVoucherMainId(eachObject) {
        const recordType = 'customrecord_gw_voucher_details'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_voucher_main_internal_id.internalid', 'anyof', eachObject.id])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_ns_document_apply_id.type', 'anyof', 'CustDep'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_ns_document_apply_id.mainline', 'is', 'T'])

        let searchColumns = []
        searchColumns.push(
            search.createColumn({
                name: 'custrecord_gw_dtl_item_tax_code',
                summary: 'GROUP'
            })
        )
        searchColumns.push(
            search.createColumn({
                name: 'custrecord_gw_item_amount',
                summary: 'SUM'
            })
        )
        let customrecord_gw_voucher_detailsSearchObj = search.create({
            type: recordType,
            filters: searchFilters,
            columns: searchColumns
        })
        let searchResultCount = customrecord_gw_voucher_detailsSearchObj.runPaged().count
        log.debug('customrecord_gw_voucher_detailsSearchObj result count', searchResultCount)
        let voucherDetailsArray = []
        customrecord_gw_voucher_detailsSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            log.debug({
                title: 'checkDepositVoucherRecordAndReturnAmount - result',
                details: result
            })
            voucherDetailsArray.push(JSON.parse(JSON.stringify(result)))
            return true
        })

        return voucherDetailsArray
    }

    function getDeductedAmount(voucherDetailsSummaryAmountArray) {
        let deductedAmount = 0
        log.audit({
            title: 'getDeductedAmount - voucherDetailsSummaryAmountArray',
            details: voucherDetailsSummaryAmountArray
        })
        voucherDetailsSummaryAmountArray.forEach(function (eachVoucherDetailsObject) {
            deductedAmount += stringutility.convertToFloat(eachVoucherDetailsObject.values['SUM(custrecord_gw_item_amount)'])
        })

        log.debug({
            title: 'getDeductedAmount - deductedAmount',
            details: deductedAmount
        })

        return deductedAmount
    }

    function checkDepositVoucherRecordAndReturnAmount(eachObject, getVoucherStatusResponse, linkedTransactionArray) {
        if(statusMapping[getVoucherStatusResponse.body.uploadStatus] !== 'C') return
        const voucherDetailsSummaryAmountArray = getVoucherDetailsSummaryAmountByVoucherMainId(eachObject)
        linkedTransactionArray.forEach(function (eachLinkedTransactionObject) {
            if(eachLinkedTransactionObject.linkedTransactionType === record.Type.INVOICE) {
                const recordType = 'customrecord_gw_deposit_voucher_record'
                let searchFilters = []
                searchFilters.push(['custrecord_gw_deposit_voucher_main_id', 'equalto', eachObject.id])
                let searchColumns = []
                searchColumns.push('custrecord_gw_deposit_voucher_status')
                searchColumns.push('custrecord_gw_deposit_voucher_main_id')
                searchColumns.push('custrecord_gw_deposit_dedcuted_amount')
                var customrecord_gw_deposit_voucher_recordSearchObj = search.create({
                    type: recordType,
                    filters: searchFilters,
                    columns: searchColumns
                })
                var searchResultCount = customrecord_gw_deposit_voucher_recordSearchObj.runPaged().count
                log.debug('customrecord_gw_deposit_voucher_recordSearchObj result count', searchResultCount)
                customrecord_gw_deposit_voucher_recordSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    let deductedAmount = stringutility.convertToFloat(result.getValue({name: 'custrecord_gw_deposit_dedcuted_amount'}))
                    deductedAmount -= getDeductedAmount(voucherDetailsSummaryAmountArray)
                    log.debug({
                        title: 'checkDepositVoucherRecordAndReturnAmount - deductedAmount',
                        details: deductedAmount
                    })
                    const resultId = record.submitFields({
                        type: recordType,
                        id: result.id,
                        values: {
                            custrecord_gw_deposit_dedcuted_amount: deductedAmount
                        }
                    })
                    log.debug({
                        title: 'updateDepositVoucherRecordStatus - submitFields resultId',
                        details: resultId
                    })
                    return true;
                })
            }
        })
    }

    function returnEGUIDiscountAmount(eachObject, getVoucherStatusResponse) {
        const taxCodeAndFieldMapping = {
            '1': 'custrecord_gw_discount_sales_amount',
            '2': 'custrecord_gw_discount_zero_amount',
            '3': 'custrecord_gw_discount_free_amount'
        }
        log.debug({
            title: 'returnEGUIDiscountAmount',
            details: 'start...'
        })
        log.audit({
            title: 'returnEGUIDiscountAmount - getVoucherStatusResponse',
            details: getVoucherStatusResponse
        })
        if(statusMapping[getVoucherStatusResponse.body.uploadStatus] !== 'C') return
        const xmlMigType = invoiceutility.getMigType('APPLY', eachObject.custrecord_gw_voucher_type, eachObject.custrecord_gw_mig_type)
        log.debug({
            title: 'returnEGUIDiscountAmount - xmlMigType',
            details: xmlMigType
        })
        if(xmlMigType !== 'B0201' || xmlMigType !== 'D0501') return
        //TODO get voucher details by voucher main id
        const voucherDetailsArray = getVoucherDetailsByVoucherMainId(eachObject.id)
        //TODO update
        voucherDetailsArray.forEach(function (voucherDetailsObject, index) {
            log.debug({
                title: `returnEGUIDiscountAmount - voucherDetailsObject, index: ${index}`, details: voucherDetailsObject
            })
            const originalVoucherMainId = voucherDetailsObject.values.custrecord_gw_original_gui_internal_id
            const itemAmount = Math.abs(voucherDetailsObject.values.custrecord_gw_item_amount) // return Amt
            const itemTaxCode = gwTaxType21.getTaxTypeByTaxCode(voucherDetailsObject.values.custrecord_gw_dtl_item_tax_code)
            log.debug({
                title: 'returnEGUIDiscountAmount - voucher details info',
                details: {
                    originalVoucherMainId,
                    itemAmount,
                    itemTaxCode
                }
            })
            let voucherMainRecordObject = record.load({
                type: 'customrecord_gw_voucher_main',
                id: originalVoucherMainId
            })
            const matchedFieldId = taxCodeAndFieldMapping[itemTaxCode.value]
            log.debug({title: `returnEGUIDiscountAmount - matchedFieldId`, details: matchedFieldId})
            let fieldValue = voucherMainRecordObject.getValue({fieldId: matchedFieldId})
            let discountCount = voucherMainRecordObject.getValue({fieldId: 'custrecord_gw_discount_count'})
            let discountAmount = voucherMainRecordObject.getValue({fieldId: 'custrecord_gw_discount_amount'})
            log.debug({
                title: 'returnEGUIDiscountAmount - existing voucher main value',
                details: {
                    matchedFieldId,
                    fieldValue,
                    discountCount,
                    discountAmount
                }
            })
            fieldValue -= itemAmount
            discountCount -= 1
            discountAmount -= itemAmount
            log.debug({
                title: 'returnEGUIDiscountAmount - updated voucher main value',
                details: {
                    matchedFieldId,
                    fieldValue,
                    discountCount,
                    discountAmount
                }
            })
            voucherMainRecordObject.setValue({
                fieldId: matchedFieldId,
                value: fieldValue
            })
            voucherMainRecordObject.setValue({
                fieldId: 'custrecord_gw_discount_count',
                value: discountCount
            })
            voucherMainRecordObject.setValue({
                fieldId: 'custrecord_gw_discount_amount',
                value: discountAmount
            })
            const resultId = voucherMainRecordObject.save()
            log.debug({title: 'returnEGUIDiscountAmount - resultId', details: resultId})
        })
    }

    function sendEmailNotification(eachObject, getVoucherStatusResponse) {
        log.debug({
            title: 'sendEmailNotification',
            details: 'start...'
        })
        log.audit({
            title: 'sendEmailNotification - eachObject',
            details: eachObject
        })
        log.audit({
            title: 'sendEmailNotification - getVoucherStatusResponse',
            details: getVoucherStatusResponse
        })
        if(statusMapping[getVoucherStatusResponse.body.uploadStatus] !== 'C') return
        const emailSubjectMapping = {
            'C0401': `發票開立通知-開立成功-${eachObject.custrecord_gw_voucher_number}`,
            'C0501': `發票作廢通知-開立成功-${eachObject.custrecord_gw_voucher_number}`,
            'D0401': `折讓單開立通知-開立成功-${eachObject.custrecord_gw_voucher_number}`,
            'D0501': `折讓單作廢通知-開立成功-${eachObject.custrecord_gw_voucher_number}`
        }
        const applyType = getVoucherStatusResponse.body.status === '作廢' ? 'CANCEL' : 'APPLY'
        const xmlMigType = invoiceutility.getMigType(applyType, eachObject.custrecord_gw_voucher_type, eachObject.custrecord_gw_mig_type)
        log.debug({
            title: 'sendEmailNotification - xmlMigType',
            details: xmlMigType
        })
        if(!emailSubjectMapping[xmlMigType]) return
        let emailSubject = emailSubjectMapping[xmlMigType]
        log.debug({
            title: 'sendEmailNotification - emailSubject',
            details: emailSubject
        })
        gwServiceEGUIEmail.sendByVoucherId(emailSubject, eachObject.id)
    }

    exports.downloadVoucherStatus = function (eachObject) {
        log.debug({title: 'downloadVoucherStatus', details: 'start...'
        })
        log.audit({
            title: 'downloadVoucherStatus - eachObject',
            details: eachObject
        })
        const richProcessSearchResult = richProcess()[0]
        if (richProcessSearchResult.values.custrecord_gw_conf_rich_process) {
            const sellerId = eachObject.custrecord_gw_seller
            //get company key and company account id
            const companyInformationArray = getRichCompanyInformationBySellerId(sellerId)
            log.debug({
                title: 'downloadVoucherStatus - companyInformationArray', details: companyInformationArray
            })
            if (companyInformationArray.length === 0) throw 'Can Not Find Mapped Company Info For Rich Process'
            // proceed rich process
            const richBaseURL = richProcessSearchResult.values.custrecord_gw_conf_rich_base_url
            // get token
            const getRichTokenResponse = getRichToken(richBaseURL, companyInformationArray[0])
            log.debug({
                title: 'downloadVoucherStatus - getRichTokenResponse', details: getRichTokenResponse
            })
            if (getRichTokenResponse.code !== 200) {
                throw getRichTokenResponse
            }

            const getVoucherStatusResponse = getVoucherStatusThroughRich(eachObject, richBaseURL, companyInformationArray[0], getRichTokenResponse)
            log.debug({
                title: 'downloadVoucherStatus - getVoucherStatusResponse', details: getVoucherStatusResponse
            })

            if(getVoucherStatusResponse.code === 200 && getVoucherStatusResponse.body.uploadStatus !== '等待上傳') {
                // TODO - proceed to update voucher main VOUCHERUPLOADSTATUS
                updateVoucherMain(eachObject, getVoucherStatusResponse)
                updateUploadLog(eachObject, getVoucherStatusResponse)
                const linkedTransactionArray = getLinkedTransaction(eachObject, getVoucherStatusResponse)
                updateLinkedTransaction(eachObject, getVoucherStatusResponse, linkedTransactionArray)

                //TODO - updateDepositVoucherRecordStatus
                updateDepositVoucherRecordStatus(eachObject, getVoucherStatusResponse, linkedTransactionArray)
                //TODO - checkDepositVoucherRecordAndReturnAmount
                checkDepositVoucherRecordAndReturnAmount(eachObject, getVoucherStatusResponse, linkedTransactionArray)
                //TODO - returnEGUIDiscountAmount
                returnEGUIDiscountAmount(eachObject, getVoucherStatusResponse, linkedTransactionArray)
                //TODO - sendByVoucherId
                sendEmailNotification(eachObject, getVoucherStatusResponse, linkedTransactionArray)
            }
        }
        log.debug({title: 'downloadVoucherStatus', details: 'end...'})
    }

    exports.getPendingVoidVoucherData = function () {
        const recordType = 'customrecord_gw_voucher_apply_list'
        let searchFilters = []
        searchFilters.push(['custrecord_gw_voucher_apply_type', 'is', 'CANCEL'])
        searchFilters.push('AND')
        searchFilters.push([
            ['custrecord_gw_voucher_open_type', 'is', 'SINGLE-ALLOWANCE-SCHEDULE'],
            'OR',
            ['custrecord_gw_voucher_open_type', 'is', 'SINGLE-EGUI-SCHEDULE']
        ])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_completed_schedule_task', 'is', 'N'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_voucher_flow_status', 'is', 'CANCEL_APPROVE'])
        let searchColumns = []
        searchColumns.push('internalid')
        searchColumns.push('custrecord_gw_voucher_apply_type')
        searchColumns.push('custrecord_gw_voucher_open_type')
        searchColumns.push('custrecord_gw_voucher_apply_date')
        searchColumns.push('custrecord_gw_voucher_apply_time')
        searchColumns.push('custrecord_gw_voucher_apply_seller')
        searchColumns.push('custrecord_gw_voucher_void_comment')
        searchColumns.push('custrecord_gw_voucher_flow_status')
        searchColumns.push('custrecord_gw_invoice_todo_list')
        searchColumns.push('custrecord_gw_creditmemo_todo_list')
        let customrecord_gw_voucher_apply_listSearchObj = search.create({
            type: recordType,
            filters: searchFilters,
            columns: searchColumns
        })
        let searchResultCount = customrecord_gw_voucher_apply_listSearchObj.runPaged().count
        log.debug({
            title: 'getPendingVoidVoucherData - customrecord_gw_voucher_apply_listSearchObj result count',
            details: searchResultCount
        })

        return customrecord_gw_voucher_apply_listSearchObj
    }

    function getVoucherMainByIds(voucherMainIds) {
        const recordType = 'customrecord_gw_voucher_main'
        let searchFilters = []
        searchFilters.push(['internalid', 'anyof', voucherMainIds])
        let searchColumns = []
        searchColumns.push('custrecord_gw_voucher_number')
        searchColumns.push(
            search.createColumn({
            name: 'custrecord_gw_voucher_date',
            sort: search.Sort.ASC
        }))
        searchColumns.push('custrecord_gw_voucher_time')
        searchColumns.push('custrecord_gw_voucher_yearmonth')
        searchColumns.push('custrecord_gw_seller')
        searchColumns.push('custrecord_gw_buyer')
        searchColumns.push('custrecord_gw_mig_type')
        searchColumns.push('custrecord_gw_original_buyer_id')
        searchColumns.push('custrecord_gw_voucher_status')
        searchColumns.push('custrecord_gw_need_upload_egui_mig')

        let customrecord_gw_voucher_mainSearchObj = search.create({
            type: recordType,
            filters: searchFilters,
            columns: searchColumns
        });
        let searchResultCount = customrecord_gw_voucher_mainSearchObj.runPaged().count;
        log.debug('getVoucherMainByIds - customrecord_gw_voucher_mainSearchObj result count', searchResultCount);
        let voucherMainRecordArray = []
        customrecord_gw_voucher_mainSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            let voucherMainObject = JSON.parse(JSON.stringify(result)).values
            voucherMainObject.id = result.id
            // voucherMainRecordArray.push(JSON.parse(JSON.stringify(result)))
            voucherMainRecordArray.push(voucherMainObject)
            return true
        })

        return voucherMainRecordArray
    }

    function setGeneralValue(xmlString, voucherObject, voucherMainRecordObject) {
        xmlString += `<BuyerId>${voucherMainRecordObject.custrecord_gw_buyer}</BuyerId>`
        xmlString += `<SellerId>${voucherMainRecordObject.custrecord_gw_seller}</SellerId>`
        xmlString += `<CancelDate>${gwDateUtil.getCurrentDateInYYYYMMDD()}</CancelDate>`
        xmlString += `<CancelTime>${gwDateUtil.getCurrentDateTime().time}</CancelTime>`
        xmlString += `<CancelReason>${voucherObject.custrecord_gw_voucher_void_comment}</CancelReason>`

        return xmlString
    }


    function generateXMLForVoid(voucherType, voucherObject, voucherMainRecordObject) {
        log.debug({
            title: 'generateXMLForVoid',
            details: 'start...'
        })
        log.audit({
            title: 'generateXMLForVoid - voucherType',
            details: voucherType
        })
        log.audit({
            title: 'generateXMLForVoid - voucherObject',
            details: voucherObject
        })
        log.audit({
            title: 'generateXMLForVoid - voucherMainRecordObject',
            details: voucherMainRecordObject
        })
        const migTypeMapping = {
            'EGUI': {
                'B2BS': `<CancelInvoice xmlns="urn:GEINV:eInvoiceMessage:C0501:3.1">`,
                'B2C': `<CancelInvoice xmlns="urn:GEINV:eInvoiceMessage:C0501:3.1">`,
                'B2BE': `<CancelInvoice xmlns="urn:GEINV:eInvoiceMessage:A0201:3.1">`
            },
            'ALLOWANCE': {
                'B2BS': `<CancelAllowance xmlns="urn:GEINV:eInvoiceMessage:D0501:3.1">`,
                'B2C': `<CancelAllowance xmlns="urn:GEINV:eInvoiceMessage:D0501:3.1">`,
                'B2B': `<CancelAllowance xmlns="urn:GEINV:eInvoiceMessage:B0501:3.1">`,
                'B2BE': `<CancelAllowance xmlns="urn:GEINV:eInvoiceMessage:B0201:3.1">`
            }
        }
        let  xmlString = `<?xml version="1.0" encoding="utf-8"?>${migTypeMapping[voucherType][voucherMainRecordObject.custrecord_gw_mig_type]}`
        try {
            if (voucherType === 'EGUI') {
                xmlString += `<CancelInvoiceNumber>${voucherMainRecordObject.custrecord_gw_voucher_number}</CancelInvoiceNumber>`
                xmlString += `<InvoiceDate>${voucherMainRecordObject.custrecord_gw_voucher_date}</InvoiceDate>`
                xmlString = setGeneralValue(xmlString, voucherObject, voucherMainRecordObject)
                if (voucherMainRecordObject.custrecord_gw_mig_type === 'B2BE') {
                    xmlString += '<Remark>' + '' + '</Remark>'
                }
                xmlString += '</CancelInvoice>'
            } else {
                xmlString += `<CancelAllowanceNumber>${voucherMainRecordObject.custrecord_gw_voucher_number}</CancelAllowanceNumber>`
                xmlString += `<AllowanceDate>${voucherMainRecordObject.custrecord_gw_voucher_date}</AllowanceDate>`
                xmlString = setGeneralValue(xmlString, voucherObject, voucherMainRecordObject)
                xmlString += '</CancelAllowance>'
            }
        } catch (e) {
            log.error({
                title: 'generateXMLForVoid - e',
                details: e
            })
        }
        return xmlString
    }

    function updateVoucherApplyRecord(voucherObject) {
        log.debug({
            title: 'updateVoucherApplyRecord',
            details: 'start...'
        })
        log.audit({
            title: 'updateVoucherApplyRecord - voucherObject',
            details: voucherObject
        })
        let submitFieldsObject = {}
        submitFieldsObject['custrecord_gw_invoice_todo_list'] = ''
        submitFieldsObject['custrecord_gw_creditmemo_todo_list'] = ''
        submitFieldsObject['custrecord_gw_completed_schedule_task'] = true
        const resultId = record.submitFields({
            type: 'customrecord_gw_voucher_apply_list',
            id: voucherObject.internalid.value,
            values: submitFieldsObject
        })
        log.debug({
            title: 'updateVoucherApplyRecord - resultId',
            details: resultId
        })
    }

    exports.proceedVoidVoucherProcess = function (voucherObject) {
        log.debug({title: 'proceedVoidVoucherProcess', details: 'start...'})
        log.audit({title: 'proceedVoidVoucherProcess - voucherObject', details: voucherObject})
        try {
            const richProcessSearchResult = richProcess()[0]
            if (richProcessSearchResult.values.custrecord_gw_conf_rich_process) {
                let voucherType = ''
                let voucherMainArray = []
                if(voucherObject.custrecord_gw_voucher_open_type.includes('EGUI')) {
                    //TODO - Void EGUI
                    voucherType = 'EGUI'
                    voucherMainArray = getVoucherMainByIds(voucherObject.custrecord_gw_invoice_todo_list.split(','))
                    log.debug({
                        title: `proceedVoidVoucherProcess - ${voucherType} - voucherMainArray`,
                        details: voucherMainArray
                    })
                    //id (id: internalid)
                    //comment (id: custrecord_gw_voucher_void_comment)
                    //apply id (id: custrecord_gw_invoice_todo_list)
                } else {
                    //TODO - Void Allowance
                    voucherType = 'ALLOWANCE'
                    voucherMainArray = getVoucherMainByIds(voucherObject.custrecord_gw_creditmemo_todo_list.split(','))
                    log.debug({
                        title: `proceedVoidVoucherProcess - ${voucherType} - voucherMainArray`,
                        details: voucherMainArray
                    })

                }

                voucherMainArray.forEach(function (voucherMainRecordObject) {
                    log.debug({
                        title: 'proceedVoidVoucherProcess - voucherMainRecordObject',
                        details: voucherMainRecordObject
                    })
                    const sellerId = voucherMainRecordObject.custrecord_gw_seller
                    //get company key and company account id
                    const companyInformationArray = getRichCompanyInformationBySellerId(sellerId)
                    log.debug({
                        title: 'mainProcess - companyInformationArray', details: companyInformationArray
                    })
                    if (companyInformationArray.length === 0) throw 'Can Not Find Mapped Company Info For Rich Process'
                    // proceed rich process
                    const richBaseURL = richProcessSearchResult.values.custrecord_gw_conf_rich_base_url
                    // get token
                    const getRichTokenResponse = getRichToken(richBaseURL, companyInformationArray[0])
                    log.debug({
                        title: 'mainProcess - getRichTokenResponse', details: getRichTokenResponse
                    })
                    if (getRichTokenResponse.code !== 200) {
                        throw getRichTokenResponse
                    }
                    let generatedObject = {}

                    generatedObject.migXML = generateXMLForVoid(voucherType, voucherObject, voucherMainRecordObject)
                    generatedObject.xmlMigType = invoiceutility.getMigType('CANCEL', voucherType, voucherMainRecordObject.custrecord_gw_mig_type)
                    generatedObject.fileName = `${generatedObject.xmlMigType}-${voucherMainRecordObject.custrecord_gw_voucher_number}-${new Date().getTime()}`
                    log.debug({
                        title: 'proceedVoidVoucherProcess - generatedObject',
                        details: generatedObject
                    })
                    const uploadResultResponse = uploadThroughRich(richBaseURL, companyInformationArray[0], getRichTokenResponse, generatedObject)
                    log.debug({
                        title: 'proceedVoidVoucherProcess - uploadResultResponse',
                        details: uploadResultResponse
                    })
                    createUploadLog(voucherMainRecordObject, generatedObject, uploadResultResponse)
                    updateVoucherMainRecord(voucherMainRecordObject, generatedObject, uploadResultResponse)
                    let uploadStatusCode = (uploadResultResponse.code === 200) ? 'P' : 'E'
                    synceguidocument.syncEguiUploadStatusToNSEvidenceStatus(voucherMainRecordObject.custrecord_gw_voucher_status, uploadStatusCode, voucherMainRecordObject.custrecord_gw_need_upload_egui_mig, voucherMainRecordObject.id)
                    updateVoucherApplyRecord(voucherObject)
                })
            }
        } catch (e) {
            log.error({
                title: 'proceedVoidVoucherProcess - e',
                details: e
            })
        }
        log.debug({title: 'proceedVoidVoucherProcess', details: 'end...'})
    }

    function getPendingSyncDataForNoneUploadVoucherSearchFilters() {
        let searchFilters = []
        searchFilters.push(['custrecord_gw_need_upload_egui_mig', 'is', 'NONE'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_is_sync_to_b2b2', 'is', 'F'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_dont_sync_to_b2b2', 'is', 'F'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_sync_error', 'isempty', ''])

        return searchFilters
    }

    function getPendingSyncDataForNoneUploadVoucherSearchColumns() {
        let searchColumns = []
        searchColumns.push('internalid')
        searchColumns.push('custrecord_gw_voucher_number')
        searchColumns.push('custrecord_gw_voucher_format_code')
        searchColumns.push('custrecord_gw_voucher_status')
        searchColumns.push('custrecord_gw_voucher_date')
        searchColumns.push('custrecord_gw_buyer')
        searchColumns.push('custrecord_gw_buyer_name')
        searchColumns.push('custrecord_gw_seller')
        searchColumns.push('custrecord_gw_seller_name')
        searchColumns.push('custrecord_gw_sales_amount')
        searchColumns.push('custrecord_gw_tax_amount')
        searchColumns.push('custrecord_gw_total_amount')
        searchColumns.push('custrecord_gw_tax_type')
        searchColumns.push('custrecord_gw_free_sales_amount')
        searchColumns.push('custrecord_gw_zero_sales_amount')
        searchColumns.push('custrecord_gw_voucher_yearmonth')
        searchColumns.push('custrecord_gw_customs_export_no')
        searchColumns.push('custrecord_gw_customs_export_date')
        searchColumns.push('custrecord_gw_applicable_zero_tax')
        searchColumns.push('custrecord_gw_clearance_mark')

        return searchColumns
    }

    exports.getPendingSyncDataForNoneUploadVoucher = function () {
        let searchFilters = getPendingSyncDataForNoneUploadVoucherSearchFilters()
        let searchColumns = getPendingSyncDataForNoneUploadVoucherSearchColumns()

        let getPendingSyncDataForNoneUploadVoucherSearchObject = search.create({
            type: 'customrecord_gw_voucher_main', filters: searchFilters, columns: searchColumns
        })

        let searchResultCount = getPendingSyncDataForNoneUploadVoucherSearchObject.runPaged().count
        log.debug({
            title: 'getPendingSyncDataForNoneUploadVoucher - searchResultCount',
            details: searchResultCount
        })

        return getPendingSyncDataForNoneUploadVoucherSearchObject
    }

    function setDontSyncToB2B2(voucherObject) {
        record.submitFields({
            type: 'customrecord_gw_voucher_main',
            id: voucherObject.internalid.value,
            values: {
                custrecord_gw_dont_sync_to_b2b2: true
            }
        })
    }

    function getRequestObject(voucherObject) {
        let requestObject = {
            invoiceNumber: voucherObject.custrecord_gw_voucher_number,
            typeCode: voucherObject.custrecord_gw_voucher_format_code,
            invoiceStatus: (voucherObject.custrecord_gw_voucher_status === 'VOUCHER_SUCCESS') ? 1 : 2,
            invoiceDate: voucherObject.custrecord_gw_voucher_date,
            buyer: voucherObject.custrecord_gw_buyer,
            buyerName: voucherObject.custrecord_gw_buyer_name,
            seller: voucherObject.custrecord_gw_seller,
            sellerName: voucherObject.custrecord_gw_seller_name,
            salesAmount: (voucherObject.custrecord_gw_buyer === '0000000000') ? voucherObject.custrecord_gw_total_amount : voucherObject.custrecord_gw_sales_amount,
            taxAmount: (voucherObject.custrecord_gw_buyer === '0000000000') ? 0 : voucherObject.custrecord_gw_tax_amount,
            totalAmount: voucherObject.custrecord_gw_total_amount,
            taxType: voucherObject.custrecord_gw_tax_type,
            freeTaxSalesAmount: voucherObject.custrecord_gw_free_sales_amount,
            zeroTaxSalesAmount: voucherObject.custrecord_gw_zero_sales_amount,
            currency: 'TWD',
            yearMonth: voucherObject.custrecord_gw_voucher_yearmonth,
            source: 'NetSuite',
            customsClearanceMark: voucherObject.custrecord_gw_clearance_mark,
            zeroTaxMark: voucherObject.custrecord_gw_applicable_zero_tax,
            outputDate: voucherObject.custrecord_gw_customs_export_date,
            commonNumber: voucherObject.custrecord_gw_customs_export_no
        }

        log.debug({
            title: 'getRequestObject - requestObject',
            details: requestObject
        })

        return requestObject
    }

    function composeRequestParam(voucherObject) {
        let requestParamArray = []
        requestParamArray.push(getRequestObject(voucherObject))
        return requestParamArray
    }

    function syncVoucherThroughRich(richBaseURL, requestParam, getRichTokenResponse) {
        log.debug({
            title: 'syncVoucherThroughRich',
            details: 'start...'
        })
        let responseObj = {
            code: 0, body: ''
        }
        let url = `${richBaseURL}/api/v1/voucher`
        log.audit({
            title: 'syncVoucherThroughRich - url',
            details: url
        })
        let headers = {}
        headers['Authorization'] = `Bearer ${getRichTokenResponse.body.id_token}`
        headers['Accept'] = `text/html, application/json, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8, application/pdf`
        headers['Accept-Language'] = `en-us`
        headers['Content-Type'] = 'application/json'

        let response = https.post({
            url: url, body: JSON.stringify(requestParam), headers: headers
        })
        log.debug({
            title: 'syncVoucherThroughRich - response',
            details: response
        })
        responseObj.code = response.code
        if (response.code !== 200) {
            responseObj.body = 'Error Occurs: ' + response.body
        } else {
            responseObj.body = JSON.parse(response.body)
        }

        return responseObj
    }

    function setIsSynced(voucherObject) {
        record.submitFields({
            type: 'customrecord_gw_voucher_main',
            id: voucherObject.internalid.value,
            values: {
                custrecord_gw_is_sync_to_b2b2: true,
                custrecord_gw_sync_error: ''
            }
        })
    }

    function setSyncError(voucherObject, syncVoucherResponse) {
        record.submitFields({
            type: 'customrecord_gw_voucher_main',
            id: voucherObject.internalid.value,
            values: {
                custrecord_gw_sync_error: JSON.stringify(syncVoucherResponse)
            }
        })
    }

    exports.proceedToSyncToB2B2 = function (voucherObject) {
        log.audit({
            title: 'proceedToSyncToB2B2 - voucherObject',
            details: voucherObject
        })
        const richProcessSearchResult = richProcess()[0]
        if (richProcessSearchResult.values.custrecord_gw_conf_rich_process) {
            //get company key and company account id
            const companyInformationArray = getRichCompanyInformationBySellerId(voucherObject.custrecord_gw_seller)
            log.audit({
                title: 'proceedToSyncToB2B2 - companyInformationArray',
                details: companyInformationArray
            })

            if(companyInformationArray.length !== 0 && companyInformationArray[0].values.custrecord_gw_be_company_key && companyInformationArray[0].values.custrecord_gw_be_company_account) {
                //TODO proceed to sync voucher to B2B2
                log.debug({
                    title: 'proceedToSyncToB2B2',
                    details: 'start...'
                })
                const richBaseURL = richProcessSearchResult.values.custrecord_gw_conf_rich_base_url
                const requestParam = composeRequestParam(voucherObject)

                // get token
                const getRichTokenResponse = getRichToken(richBaseURL, companyInformationArray[0])
                log.debug({
                    title: 'mainProcess - getRichTokenResponse', details: getRichTokenResponse
                })
                if (getRichTokenResponse.code !== 200) {
                    throw getRichTokenResponse
                }

                const syncVoucherResponse = syncVoucherThroughRich(richBaseURL, requestParam, getRichTokenResponse)
                log.debug({
                    title: 'proceedToSyncToB2B2 - syncVoucherResponse',
                    details: syncVoucherResponse
                })
                if(syncVoucherResponse.code === 200 && syncVoucherResponse.body.finalStatus === 'C') {
                    setIsSynced(voucherObject)
                } else if (syncVoucherResponse.code === 200 && syncVoucherResponse.body.finalStatus === 'E') {
                    //TODO set sync error
                    setSyncError(voucherObject, syncVoucherResponse)
                }
            } else {
                //TODO set custrecord_gw_dont_sync_to_b2b2 to true
                setDontSyncToB2B2(voucherObject)
            }
        } else {
            //TODO set custrecord_gw_dont_sync_to_b2b2 to true
            setDontSyncToB2B2(voucherObject)
        }
    }

    function getPendingSyncAPVoucherDataSearchFilters() {
        let searchFilters = []
        searchFilters.push(['custrecord_gw_ap_doc_apply', 'is', 'T'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_ap_doc_is_synced_to_b2b2', 'is', 'F'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_ap_doc_dont_sync_to_b2b2', 'is', 'F'])
        searchFilters.push('AND')
        searchFilters.push(['custrecord_gw_ap_doc_sync_error', 'isempty', ''])

        return searchFilters
    }

    function getPendingSyncAPVoucherDataSearchColumns() {
        let searchColumns = []

        searchColumns.push('internalid')
        searchColumns.push(
            search.createColumn({
            name: 'custrecord_gw_ap_doc_type_value',
            join: 'CUSTRECORD_GW_AP_DOC_TYPE'
        }))
        searchColumns.push('custrecord_gw_ap_doc_issue_date')
        searchColumns.push('custrecord_gw_ap_doc_acct_period')
        searchColumns.push('custrecord_gw_ap_doc_apply_period')
        searchColumns.push('custrecord_gw_ap_doc_apply_period')
        searchColumns.push('custrecord_gw_ap_doc_gui_num')
        searchColumns.push('custrecord_gw_ap_doc_comm_num')
        searchColumns.push(
            search.createColumn({
                name: 'custrecord_gw_ap_doc_status_value',
                join: 'CUSTRECORD_GW_AP_DOC_STATUS'
        }))
        searchColumns.push('custrecord_gw_ap_doc_buyer_tax_id')
        searchColumns.push('custrecord_gw_ap_doc_buyer_name')
        searchColumns.push('custrecord_gw_ap_doc_seller_tax_id')
        searchColumns.push('custrecord_gw_ap_doc_seller_name')
        searchColumns.push(
            search.createColumn({
                name: 'custrecord_gw_ap_doc_tax_type_value',
                join: 'CUSTRECORD_GW_AP_DOC_TAX_TYPE'
        }))
        searchColumns.push('custrecord_gw_ap_doc_sales_amt')
        searchColumns.push('custrecord_gw_ap_doc_ztr_amt')
        searchColumns.push('custrecord_gw_ap_doc_exempt_amt')
        searchColumns.push('custrecord_gw_ap_doc_tax_amt')
        searchColumns.push('custrecord_gw_ap_doc_total_amt')
        searchColumns.push(
            search.createColumn({
            name: 'custrecord_gw_ap_doc_deduct_value',
            join: 'CUSTRECORD_GW_AP_DOC_DEDUCT_CODE'
        }))
        searchColumns.push('custrecord_gw_ap_doc_co_mark')
        searchColumns.push(
            search.createColumn({
                name: 'custrecord_gw_ap_doc_consol_value',
                join: 'custrecord_gw_ap_doc_co_mark'
            })
        )
        searchColumns.push('custrecord_gw_ap_doc_co_qty')
        searchColumns.push('custrecord_gw_ap_doc_custom_mark')
        searchColumns.push(
            search.createColumn({
            name: 'custrecord_gw_ap_doc_currency_value',
            join: 'CUSTRECORD_GW_AP_DOC_CURRENCY'
        }))
        searchColumns.push('custrecord_gw_ap_doc_zero_tax_mark')
        searchColumns.push('custrecord_gw_ap_doc_close_date')
        searchColumns.push('custrecord_gw_ap_doc_business_unit')
        searchColumns.push('custrecord_gw_ap_doc_related_number')
        searchColumns.push('custrecord_gw_ap_doc_source')
        searchColumns.push('custrecord_gw_ap_doc_buyer')
        searchColumns.push('custrecord_gw_ap_doc_is_synced_to_b2b2')
        searchColumns.push('custrecord_gw_ap_doc_dont_sync_to_b2b2')

        return searchColumns
    }

    exports.getPendingSyncAPVoucherData = function () {
        let searchFilters = getPendingSyncAPVoucherDataSearchFilters()
        let searchColumns = getPendingSyncAPVoucherDataSearchColumns()

        let getPendingSyncAPVoucherDataSearchObject = search.create({
            type: 'customrecord_gw_ap_doc', filters: searchFilters, columns: searchColumns
        })

        let searchResultCount = getPendingSyncAPVoucherDataSearchObject.runPaged().count
        log.debug({
            title: 'getPendingSyncAPVoucherData result count',
            details: searchResultCount
        })

        return getPendingSyncAPVoucherDataSearchObject
    }

    function getConsolidationMark(APVoucherObject) {
        return APVoucherObject['custrecord_gw_ap_doc_consol_value.custrecord_gw_ap_doc_co_mark']
    }

    function getConsolidationQuantity(APVoucherObject) {
        return APVoucherObject['custrecord_gw_ap_doc_co_qty']
    }

    function getRequestAPObject(APVoucherObject) {
        let requestObject = {
            invoiceNumber: APVoucherObject.custrecord_gw_ap_doc_gui_num,
            typeCode: APVoucherObject['custrecord_gw_ap_doc_type_value.CUSTRECORD_GW_AP_DOC_TYPE'],
            invoiceStatus: APVoucherObject['custrecord_gw_ap_doc_status_value.CUSTRECORD_GW_AP_DOC_STATUS'],
            invoiceDate: gwDateUtil.getDateWithFormatInYYYYMMDD(APVoucherObject.custrecord_gw_ap_doc_issue_date, gwLibCompanyConfig.getCompanyDateFormat()),
            buyer: APVoucherObject.custrecord_gw_ap_doc_buyer_tax_id,
            buyerName: APVoucherObject.custrecord_gw_ap_doc_buyer_name,
            seller: APVoucherObject.custrecord_gw_ap_doc_seller_tax_id,
            sellerName: APVoucherObject.custrecord_gw_ap_doc_seller_name,
            salesAmount: APVoucherObject.custrecord_gw_ap_doc_sales_amt,
            taxAmount: APVoucherObject.custrecord_gw_ap_doc_tax_amt,
            totalAmount: APVoucherObject.custrecord_gw_ap_doc_total_amt,
            taxType: APVoucherObject['custrecord_gw_ap_doc_tax_type_value.CUSTRECORD_GW_AP_DOC_TAX_TYPE'],
            freeTaxSalesAmount: (APVoucherObject.custrecord_gw_ap_doc_exempt_amt === '.00') ? '0' : APVoucherObject.custrecord_gw_ap_doc_exempt_amt,
            zeroTaxSalesAmount: (APVoucherObject.custrecord_gw_ap_doc_ztr_amt === '.00') ? '0' : APVoucherObject.custrecord_gw_ap_doc_ztr_amt,
            currency: APVoucherObject['custrecord_gw_ap_doc_currency_value.CUSTRECORD_GW_AP_DOC_CURRENCY'],
            yearMonth: APVoucherObject.custrecord_gw_ap_doc_apply_period.text,
            source: 'NetSuite',
            customsClearanceMark: APVoucherObject.custrecord_gw_ap_doc_custom_mark,
            zeroTaxMark: APVoucherObject.custrecord_gw_ap_doc_zero_tax_mark,
            outputDate: APVoucherObject.custrecord_gw_ap_doc_close_date,
            commonNumber: APVoucherObject.custrecord_gw_ap_doc_comm_num,
            deductionCode: APVoucherObject['custrecord_gw_ap_doc_deduct_value.CUSTRECORD_GW_AP_DOC_DEDUCT_CODE'],
            consolidationMark: getConsolidationMark(APVoucherObject),
            consolidationQuantity: getConsolidationQuantity(APVoucherObject),
            
        }

        log.debug({
            title: 'getRequestAPObject - requestObject',
            details: requestObject
        })

        return requestObject
    }

    function composeAPVoucherRequestParam(APVoucherObject) {
        let requestAPParamArray = []
        requestAPParamArray.push(getRequestAPObject(APVoucherObject))
        return requestAPParamArray
    }

    function setDontSyncToB2B2ForAP(APVoucherObject) {
        record.submitFields({
            type: 'customrecord_gw_ap_doc',
            id: APVoucherObject.internalid.value,
            values: {
                custrecord_gw_ap_doc_dont_sync_to_b2b2: true
            }
        })
    }

    function setIsSyncedForAP(APVoucherObject) {
        record.submitFields({
            type: 'customrecord_gw_ap_doc',
            id: APVoucherObject.internalid.value,
            values: {
                custrecord_gw_ap_doc_is_synced_to_b2b2: true,
                custrecord_gw_ap_doc_sync_error: ''
            }
        })
    }

    function setSyncErrorForAP(APVoucherObject, syncVoucherResponse) {
        record.submitFields({
            type: 'customrecord_gw_ap_doc',
            id: APVoucherObject.internalid.value,
            values: {
                custrecord_gw_ap_doc_sync_error: JSON.stringify(syncVoucherResponse)
            }
        })
    }

    exports.proceedToSyncAPToB2B2 = function (APVoucherObject) {
        log.audit({
            title: 'proceedToSyncAPToB2B2 - APVoucherObject',
            details: APVoucherObject
        })
        const richProcessSearchResult = richProcess()[0]
        if (richProcessSearchResult.values.custrecord_gw_conf_rich_process) {
            //get company key and company account id
            const companyInformationArray = getRichCompanyInformationBySellerId(APVoucherObject.custrecord_gw_ap_doc_buyer_tax_id)
            log.audit({
                title: 'proceedToSyncAPToB2B2 - companyInformationArray',
                details: companyInformationArray
            })

            if(companyInformationArray.length !== 0 && companyInformationArray[0].values.custrecord_gw_be_company_key && companyInformationArray[0].values.custrecord_gw_be_company_account) {
                //TODO proceed To Sync AP To B2B2
                log.debug({
                    title: 'proceedToSyncAPToB2B2',
                    details: 'start...'
                })
                const richBaseURL = richProcessSearchResult.values.custrecord_gw_conf_rich_base_url
                const requestParam = composeAPVoucherRequestParam(APVoucherObject)

                // get token
                const getRichTokenResponse = getRichToken(richBaseURL, companyInformationArray[0])
                log.debug({
                    title: 'mainProcess - getRichTokenResponse', details: getRichTokenResponse
                })
                if (getRichTokenResponse.code !== 200) {
                    throw getRichTokenResponse
                }

                const syncVoucherResponse = syncVoucherThroughRich(richBaseURL, requestParam, getRichTokenResponse)
                log.debug({
                    title: 'proceedToSyncAPToB2B2 - syncVoucherResponse',
                    details: syncVoucherResponse
                })
                if(syncVoucherResponse.code === 200 && syncVoucherResponse.body.finalStatus === 'C') {
                    setIsSyncedForAP(APVoucherObject)
                } else if (syncVoucherResponse.code === 200 && syncVoucherResponse.body.finalStatus === 'E') {
                    //TODO set sync error
                    setSyncErrorForAP(APVoucherObject, syncVoucherResponse)
                }
            } else {
                //TODO set custrecord_gw_ap_doc_dont_sync_to_b2b2 to true
                setDontSyncToB2B2ForAP(APVoucherObject)
            }
        } else {
            //TODO set custrecord_gw_ap_doc_dont_sync_to_b2b2 to true
            setDontSyncToB2B2ForAP(APVoucherObject)
        }
    }

    return exports
});
