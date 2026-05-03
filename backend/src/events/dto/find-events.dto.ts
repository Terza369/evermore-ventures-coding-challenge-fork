import { IsOptional, IsDateString } from 'class-validator';

export class FindEventsDto {
   @IsOptional()
   @IsDateString()
   from?: string;

   @IsOptional()
   @IsDateString()
   to?: string;
}
