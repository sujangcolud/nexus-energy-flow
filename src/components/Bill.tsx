import React from "react";

interface BillProps {
  income: any;
  sellerInfo: any;
  billData: any;
  user: any;
}

const Bill: React.FC<BillProps> = ({
  income,
  sellerInfo,
  billData,
  user,
}) => {
  const calculateVAT = (total: number) => {
    const base = total / 1.13;
    const vat = total - base;
    return { base, vat };
  };

  const { base, vat } = calculateVAT(income.total);

  return (
    <div className="invoice-box" id="bill-content-to-print">
      <table cellPadding="0" cellSpacing="0">
        <tr className="top">
          <td colSpan={2}>
            <table>
              <tr>
                <td className="title">VAT INVOICE</td>
                <td>
                  Invoice #: INV-{income.id.slice(0, 8)}
                  <br />
                  Created: {new Date().toISOString().split("T")[0]}
                  <br />
                  IRN: IRN-{income.id.slice(0, 8)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr className="information">
          <td colSpan={2}>
            <table>
              <tr>
                <td>
                  <strong>Seller:</strong>
                  <br />
                  {sellerInfo.name}
                  <br />
                  PAN/VAT: {sellerInfo.pan}
                  <br />
                  {sellerInfo.address}
                  <br />
                  {sellerInfo.contactNumber}
                </td>
                <td>
                  <strong>Buyer:</strong>
                  <br />
                  {billData.buyerName || "Walk-in Customer"}
                  <br />
                  PAN/VAT: {billData.buyerPan}
                  <br />
                  {billData.buyerAddress}
                  <br />
                  {billData.buyerContact}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr className="heading">
          <td>Payment Method</td>
          <td>{income.payment_mode}</td>
        </tr>
        <tr className="details">
          <td>Paid</td>
          <td>NPR {income.total.toFixed(2)}</td>
        </tr>
        <tr className="heading">
          <td>Item</td>
          <td>Price</td>
        </tr>
        {income.items.map((item: any, index: number) => (
          <tr className="item" key={index}>
            <td>
              {item.description} ({item.quantity} pcs @ NPR {item.unitPrice})
            </td>
            <td>NPR {item.totalPriceWithVAT.toFixed(2)}</td>
          </tr>
        ))}
        <tr className="item last">
          <td>Subtotal</td>
          <td>NPR {base.toFixed(2)}</td>
        </tr>
        <tr className="item">
          <td>VAT 13%</td>
          <td>NPR {vat.toFixed(2)}</td>
        </tr>
        <tr className="total">
          <td></td>
          <td>Grand Total: NPR {income.total.toFixed(2)}</td>
        </tr>
      </table>
      <div className="footer">
        Prepared By: {billData.preparedBy || user?.email} | Approved By:{" "}
        {billData.approvedBy || "Finance Officer"}
        <br />
        Thank you for your business! Goods once sold are not returnable.
        <br />
        (QR Code & IRD E-billing ready)
      </div>
    </div>
  );
};

export default Bill;
