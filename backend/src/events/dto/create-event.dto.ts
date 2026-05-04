import { IsString, IsNotEmpty, IsDateString, IsOptional, IsIn, IsDefined, ValidateIf } from 'class-validator';

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

   @ValidateIf((o) => o.recurrenceRule != null || o.recurrenceEnd != null)
   @IsDefined({ message: 'recurrenceEnd is required when recurrenceRule is set' })
   @IsDateString()
   recurrenceEnd?: string;
}
