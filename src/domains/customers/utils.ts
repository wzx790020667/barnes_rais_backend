import { supabase } from "../../lib/db";

type CustomerCriteria = {
  id: string;
  customer_name: string;
  co_code: string | null;
  file_format: string;
};

/**
 * Count approved documents for each customer based on matching customer_name, co_code, and file_format
 * @param customerCriteria Array of customer criteria to match against
 * @returns Record mapping customer IDs to their approved document counts
 */
export async function countApprovedDocumentsForCustomers(
  customerCriteria: CustomerCriteria[]
): Promise<Record<string, number>> {
  const approvedDocumentCounts: Record<string, number> = {};
  
  if (customerCriteria.length === 0) {
    return approvedDocumentCounts;
  }
  
  // Query all approved documents
  const { data: approvedDocsData, error: approvedDocsError } = await supabase
    .from("documents")
    .select("customer_name, co_code, file_format")
    .eq("status", "approved");
    
  if (approvedDocsError) throw approvedDocsError;
  
  // Count documents matching all three criteria per customer
  customerCriteria.forEach(customer => {
    const matchingDocs = (approvedDocsData || []).filter(doc => 
      doc.customer_name === customer.customer_name && 
      doc.co_code === customer.co_code &&
      doc.file_format === customer.file_format
    );
    
    approvedDocumentCounts[customer.id] = matchingDocs.length;
  });
  
  return approvedDocumentCounts;
}
