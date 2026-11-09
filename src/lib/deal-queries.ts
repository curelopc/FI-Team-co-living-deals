import { queryOptions } from '@tanstack/react-query';
import { getDeal, getDeals } from './deals.functions';
export const dealsQuery = () => queryOptions({queryKey:['deals'], queryFn:()=>getDeals({data:{refresh:false}}), staleTime:60000, retry:false});
export const dealQuery = (id:string) => queryOptions({queryKey:['deal',id], queryFn:()=>getDeal({data:{id}}), staleTime:60000, retry:false});
