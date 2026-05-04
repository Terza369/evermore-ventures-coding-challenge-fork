import { IsString, IsNotEmpty, IsDateString, IsOptional, IsIn } from 'class-validator';

export class CreateEventDto {
   @IsString()
   @IsNotEmpty()
   title!: string;

   @IsDateString()
   startTime!: string;

   @IsDateString()
   endTime!: string;

   @IsString()
   @IsNotEmpty()
   timezone!: string;

   @IsOptional()
   @IsIn(['WEEKLY'])
   recurrenceRule?: string;

   @IsOptional()
   @IsDateString()
   recurrenceEnd?: string;
}
