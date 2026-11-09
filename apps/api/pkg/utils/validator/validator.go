// Package validator wraps go-playground/validator for Echo and turns its
// errors into the Thai, field-keyed JSON the internal UI shows inline.
package validator

import (
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

// Validator implements echo.Validator.
type Validator struct {
	validate *validator.Validate
}

// New builds the request validator.
func New() *Validator {
	v := validator.New(validator.WithRequiredStructEnabled())
	// Report the JSON name so the UI can highlight the right input.
	v.RegisterTagNameFunc(func(field reflect.StructField) string {
		name := strings.Split(field.Tag.Get("json"), ",")[0]
		if name == "" || name == "-" {
			return field.Name
		}
		return name
	})
	return &Validator{validate: v}
}

// Validate runs the struct tags. On failure it returns *Errors, which the
// handlers hand straight back as the 422 body.
func (v *Validator) Validate(i interface{}) error {
	err := v.validate.Struct(i)
	if err == nil {
		return nil
	}

	var invalid *validator.InvalidValidationError
	if errors.As(err, &invalid) {
		// A programming error (validating a non-struct), not a bad request.
		return err
	}
	return newErrors(err)
}

// Errors is the body returned for a 422: the shared `error` key plus a message
// per field.
type Errors struct {
	Message string            `json:"error"`
	Fields  map[string]string `json:"fields"`
}

// Error makes *Errors an error value.
func (e *Errors) Error() string { return e.Message }

func newErrors(err error) *Errors {
	out := &Errors{Message: "ข้อมูลที่กรอกไม่ถูกต้อง", Fields: map[string]string{}}

	var fieldErrors validator.ValidationErrors
	if !errors.As(err, &fieldErrors) {
		out.Message = err.Error()
		return out
	}
	for _, fieldErr := range fieldErrors {
		out.Fields[fieldErr.Field()] = message(fieldErr)
	}
	return out
}

func message(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return "กรอกข้อมูลนี้ด้วย"
	case "email":
		return "รูปแบบอีเมลไม่ถูกต้อง"
	case "min":
		return fmt.Sprintf("ต้องมีอย่างน้อย %s ตัวอักษร", e.Param())
	case "max":
		return fmt.Sprintf("ต้องไม่เกิน %s ตัวอักษร", e.Param())
	case "gte":
		return fmt.Sprintf("ต้องไม่น้อยกว่า %s", e.Param())
	case "lte":
		return fmt.Sprintf("ต้องไม่เกิน %s", e.Param())
	case "oneof":
		return fmt.Sprintf("ต้องเป็นค่าใดค่าหนึ่งใน: %s", strings.ReplaceAll(e.Param(), " ", ", "))
	case "url":
		return "รูปแบบลิงก์ไม่ถูกต้อง"
	case "numeric":
		return "กรอกเป็นตัวเลข"
	case "datetime":
		return "รูปแบบวันที่ไม่ถูกต้อง"
	default:
		return "ข้อมูลไม่ถูกต้อง"
	}
}
